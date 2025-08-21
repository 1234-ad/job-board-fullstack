const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { Resume, Job, AIAnalysis } = require('../models');
const auth = require('../middleware/auth');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/ai/analyze-resume - Analyze resume with AI
router.post('/analyze-resume', auth, async (req, res) => {
  try {
    const { resume_id } = req.body;

    // Get resume data
    const resume = await Resume.findOne({
      where: { 
        id: resume_id,
        user_id: req.user.id 
      },
      include: ['skills', 'work_experience', 'education']
    });

    if (!resume) {
      return res.status(404).json({ 
        success: false, 
        error: 'Resume not found' 
      });
    }

    // Prepare resume data for AI analysis
    const resumeText = `
      Title: ${resume.title}
      Summary: ${resume.summary}
      Experience: ${resume.experience_years} years
      Current Position: ${resume.current_position}
      Current Company: ${resume.current_company}
      Location: ${resume.location}
      
      Skills: ${resume.skills?.map(s => s.name).join(', ')}
      
      Work Experience:
      ${resume.work_experience?.map(exp => `
        - ${exp.position} at ${exp.company_name} (${exp.start_date} - ${exp.end_date || 'Present'})
        ${exp.description}
      `).join('\n')}
      
      Education:
      ${resume.education?.map(edu => `
        - ${edu.degree} in ${edu.field_of_study} from ${edu.institution}
      `).join('\n')}
    `;

    // AI Analysis Prompt
    const prompt = `
      Analyze the following resume and provide insights:
      
      ${resumeText}
      
      Please provide:
      1. Overall resume score (0-100)
      2. Strengths (top 3)
      3. Areas for improvement (top 3)
      4. Suggested skills to add
      5. Industry recommendations
      6. ATS optimization tips
      
      Format the response as JSON with the following structure:
      {
        "score": number,
        "strengths": [string],
        "improvements": [string],
        "suggested_skills": [string],
        "industry_recommendations": [string],
        "ats_tips": [string]
      }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert HR professional and resume analyst. Provide detailed, actionable feedback on resumes."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const analysis = JSON.parse(completion.choices[0].message.content);

    // Save analysis to database
    const aiAnalysis = await AIAnalysis.create({
      resume_id: resume.id,
      analysis_type: 'resume_score',
      score: analysis.score,
      insights: analysis
    });

    res.json({
      success: true,
      data: {
        analysis_id: aiAnalysis.id,
        ...analysis
      }
    });

  } catch (error) {
    console.error('AI Analysis Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to analyze resume' 
    });
  }
});

// POST /api/ai/match-jobs - Find matching jobs for resume
router.post('/match-jobs', auth, async (req, res) => {
  try {
    const { resume_id, limit = 10 } = req.body;

    // Get resume data
    const resume = await Resume.findOne({
      where: { 
        id: resume_id,
        user_id: req.user.id 
      },
      include: ['skills', 'work_experience']
    });

    if (!resume) {
      return res.status(404).json({ 
        success: false, 
        error: 'Resume not found' 
      });
    }

    // Get active jobs
    const jobs = await Job.findAll({
      where: { is_active: true },
      limit: 50, // Get more jobs for better matching
      order: [['created_at', 'DESC']]
    });

    // Prepare data for AI matching
    const resumeSkills = resume.skills?.map(s => s.name).join(', ') || '';
    const resumeExperience = resume.work_experience?.map(exp => 
      `${exp.position} at ${exp.company_name}`
    ).join(', ') || '';

    const matchingPrompt = `
      Resume Profile:
      - Title: ${resume.title}
      - Experience: ${resume.experience_years} years
      - Skills: ${resumeSkills}
      - Experience: ${resumeExperience}
      - Location: ${resume.location}
      
      Available Jobs:
      ${jobs.map((job, index) => `
        ${index + 1}. ${job.title} at ${job.location}
        Requirements: ${job.requirements}
        Description: ${job.description.substring(0, 200)}...
      `).join('\n')}
      
      Analyze the resume against these jobs and return the top ${limit} matches.
      For each match, provide:
      1. Job index (1-based)
      2. Match score (0-100)
      3. Matching skills
      4. Missing skills
      5. Match reasoning
      
      Format as JSON array:
      [
        {
          "job_index": number,
          "match_score": number,
          "matching_skills": [string],
          "missing_skills": [string],
          "reasoning": string
        }
      ]
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert job matching AI. Analyze resumes against job requirements and provide accurate match scores."
        },
        {
          role: "user",
          content: matchingPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const matches = JSON.parse(completion.choices[0].message.content);

    // Map job indices back to actual jobs and save analysis
    const jobMatches = matches.map(match => {
      const job = jobs[match.job_index - 1];
      return {
        job: {
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          employment_type: job.employment_type,
          salary_min: job.salary_min,
          salary_max: job.salary_max
        },
        match_score: match.match_score,
        matching_skills: match.matching_skills,
        missing_skills: match.missing_skills,
        reasoning: match.reasoning
      };
    });

    // Save job matching analysis
    for (const match of jobMatches.slice(0, 5)) { // Save top 5 matches
      await AIAnalysis.create({
        resume_id: resume.id,
        job_id: match.job.id,
        analysis_type: 'job_match',
        score: match.match_score,
        insights: {
          matching_skills: match.matching_skills,
          missing_skills: match.missing_skills,
          reasoning: match.reasoning
        }
      });
    }

    res.json({
      success: true,
      data: {
        matches: jobMatches,
        total_jobs_analyzed: jobs.length
      }
    });

  } catch (error) {
    console.error('Job Matching Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to match jobs' 
    });
  }
});

// POST /api/ai/skill-gap-analysis - Analyze skill gaps for target role
router.post('/skill-gap-analysis', auth, async (req, res) => {
  try {
    const { resume_id, target_role, target_industry } = req.body;

    // Get resume data
    const resume = await Resume.findOne({
      where: { 
        id: resume_id,
        user_id: req.user.id 
      },
      include: ['skills', 'work_experience']
    });

    if (!resume) {
      return res.status(404).json({ 
        success: false, 
        error: 'Resume not found' 
      });
    }

    const currentSkills = resume.skills?.map(s => s.name).join(', ') || '';
    const experience = resume.work_experience?.map(exp => 
      `${exp.position} (${exp.years_experience || 0} years)`
    ).join(', ') || '';

    const skillGapPrompt = `
      Current Profile:
      - Role: ${resume.current_position}
      - Experience: ${resume.experience_years} years
      - Skills: ${currentSkills}
      - Work History: ${experience}
      
      Target Role: ${target_role}
      Target Industry: ${target_industry}
      
      Analyze the skill gap between current profile and target role.
      Provide:
      1. Required skills for target role
      2. Skills the candidate already has
      3. Missing critical skills
      4. Nice-to-have skills
      5. Learning path recommendations
      6. Estimated time to bridge gaps
      7. Certification recommendations
      
      Format as JSON:
      {
        "required_skills": [string],
        "existing_skills": [string],
        "critical_gaps": [string],
        "nice_to_have": [string],
        "learning_path": [
          {
            "skill": string,
            "priority": "high|medium|low",
            "estimated_time": string,
            "resources": [string]
          }
        ],
        "certifications": [string],
        "overall_readiness": number
      }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a career development expert specializing in skill gap analysis and career transitions."
        },
        {
          role: "user",
          content: skillGapPrompt
        }
      ],
      temperature: 0.5,
      max_tokens: 1500
    });

    const analysis = JSON.parse(completion.choices[0].message.content);

    // Save skill gap analysis
    const aiAnalysis = await AIAnalysis.create({
      resume_id: resume.id,
      analysis_type: 'skill_gap',
      score: analysis.overall_readiness,
      insights: {
        target_role,
        target_industry,
        ...analysis
      }
    });

    res.json({
      success: true,
      data: {
        analysis_id: aiAnalysis.id,
        target_role,
        target_industry,
        ...analysis
      }
    });

  } catch (error) {
    console.error('Skill Gap Analysis Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to analyze skill gaps' 
    });
  }
});

// GET /api/ai/analysis-history - Get AI analysis history
router.get('/analysis-history', auth, async (req, res) => {
  try {
    const { resume_id, analysis_type } = req.query;

    const whereClause = {};
    if (resume_id) whereClause.resume_id = resume_id;
    if (analysis_type) whereClause.analysis_type = analysis_type;

    const analyses = await AIAnalysis.findAll({
      where: whereClause,
      include: [
        {
          model: Resume,
          where: { user_id: req.user.id },
          attributes: ['id', 'title']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 50
    });

    res.json({
      success: true,
      data: analyses
    });

  } catch (error) {
    console.error('Analysis History Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch analysis history' 
    });
  }
});

// POST /api/ai/improve-resume - Get AI suggestions to improve resume
router.post('/improve-resume', auth, async (req, res) => {
  try {
    const { resume_id, target_role } = req.body;

    const resume = await Resume.findOne({
      where: { 
        id: resume_id,
        user_id: req.user.id 
      },
      include: ['skills', 'work_experience', 'education']
    });

    if (!resume) {
      return res.status(404).json({ 
        success: false, 
        error: 'Resume not found' 
      });
    }

    const improvementPrompt = `
      Current Resume:
      Title: ${resume.title}
      Summary: ${resume.summary}
      Experience: ${resume.experience_years} years
      Skills: ${resume.skills?.map(s => s.name).join(', ')}
      
      Work Experience:
      ${resume.work_experience?.map(exp => `
        ${exp.position} at ${exp.company_name}
        ${exp.description}
      `).join('\n')}
      
      Target Role: ${target_role || 'General improvement'}
      
      Provide specific improvement suggestions:
      1. Better resume title options
      2. Improved professional summary
      3. Enhanced work experience descriptions
      4. Skills to add/remove
      5. Keywords for ATS optimization
      6. Format and structure improvements
      
      Format as JSON:
      {
        "title_suggestions": [string],
        "summary_improvement": string,
        "experience_improvements": [
          {
            "original": string,
            "improved": string,
            "reasoning": string
          }
        ],
        "skills_to_add": [string],
        "skills_to_remove": [string],
        "ats_keywords": [string],
        "format_tips": [string]
      }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional resume writer and career coach. Provide specific, actionable improvements."
        },
        {
          role: "user",
          content: improvementPrompt
        }
      ],
      temperature: 0.6,
      max_tokens: 2000
    });

    const improvements = JSON.parse(completion.choices[0].message.content);

    res.json({
      success: true,
      data: improvements
    });

  } catch (error) {
    console.error('Resume Improvement Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate improvement suggestions' 
    });
  }
});

module.exports = router;