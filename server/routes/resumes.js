const express = require('express');
const router = express.Router();
const { Resume, User, Skill, ResumeSkill, WorkExperience, Education } = require('../models');
const auth = require('../middleware/auth');
const { validateResume } = require('../middleware/validation');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/resumes/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

// GET /api/resumes - Get user's resumes
router.get('/', auth, async (req, res) => {
  try {
    const resumes = await Resume.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: ResumeSkill,
          include: [{ model: Skill }]
        },
        { model: WorkExperience },
        { model: Education }
      ],
      order: [['updated_at', 'DESC']]
    });

    res.json({
      success: true,
      data: resumes,
      count: resumes.length
    });
  } catch (error) {
    console.error('Error fetching resumes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch resumes' 
    });
  }
});

// GET /api/resumes/:id - Get specific resume
router.get('/:id', auth, async (req, res) => {
  try {
    const resume = await Resume.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      },
      include: [
        {
          model: ResumeSkill,
          include: [{ model: Skill }]
        },
        { model: WorkExperience },
        { model: Education }
      ]
    });

    if (!resume) {
      return res.status(404).json({ 
        success: false, 
        error: 'Resume not found' 
      });
    }

    res.json({
      success: true,
      data: resume
    });
  } catch (error) {
    console.error('Error fetching resume:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch resume' 
    });
  }
});

// POST /api/resumes - Create new resume
router.post('/', auth, validateResume, upload.single('resume_file'), async (req, res) => {
  try {
    const {
      title,
      summary,
      experience_years,
      current_position,
      current_company,
      location,
      salary_expectation,
      skills,
      work_experience,
      education
    } = req.body;

    // Create resume
    const resume = await Resume.create({
      user_id: req.user.id,
      title,
      summary,
      experience_years: parseInt(experience_years) || 0,
      current_position,
      current_company,
      location,
      salary_expectation: parseFloat(salary_expectation) || null,
      resume_file_url: req.file ? `/uploads/resumes/${req.file.filename}` : null
    });

    // Add skills if provided
    if (skills && Array.isArray(skills)) {
      for (const skillData of skills) {
        const [skill] = await Skill.findOrCreate({
          where: { name: skillData.name },
          defaults: { category: skillData.category || 'General' }
        });

        await ResumeSkill.create({
          resume_id: resume.id,
          skill_id: skill.id,
          proficiency_level: skillData.proficiency_level || 'intermediate',
          years_experience: skillData.years_experience || 0
        });
      }
    }

    // Add work experience if provided
    if (work_experience && Array.isArray(work_experience)) {
      for (const exp of work_experience) {
        await WorkExperience.create({
          resume_id: resume.id,
          ...exp
        });
      }
    }

    // Add education if provided
    if (education && Array.isArray(education)) {
      for (const edu of education) {
        await Education.create({
          resume_id: resume.id,
          ...edu
        });
      }
    }

    // Fetch complete resume with associations
    const completeResume = await Resume.findByPk(resume.id, {
      include: [
        {
          model: ResumeSkill,
          include: [{ model: Skill }]
        },
        { model: WorkExperience },
        { model: Education }
      ]
    });

    res.status(201).json({
      success: true,
      data: completeResume,
      message: 'Resume created successfully'
    });
  } catch (error) {
    console.error('Error creating resume:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create resume' 
    });
  }
});

// PUT /api/resumes/:id - Update resume
router.put('/:id', auth, validateResume, upload.single('resume_file'), async (req, res) => {
  try {
    const resume = await Resume.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      }
    });

    if (!resume) {
      return res.status(404).json({ 
        success: false, 
        error: 'Resume not found' 
      });
    }

    const updateData = { ...req.body };
    if (req.file) {
      updateData.resume_file_url = `/uploads/resumes/${req.file.filename}`;
    }

    await resume.update(updateData);

    // Update skills if provided
    if (req.body.skills) {
      await ResumeSkill.destroy({ where: { resume_id: resume.id } });
      
      for (const skillData of req.body.skills) {
        const [skill] = await Skill.findOrCreate({
          where: { name: skillData.name },
          defaults: { category: skillData.category || 'General' }
        });

        await ResumeSkill.create({
          resume_id: resume.id,
          skill_id: skill.id,
          proficiency_level: skillData.proficiency_level || 'intermediate',
          years_experience: skillData.years_experience || 0
        });
      }
    }

    const updatedResume = await Resume.findByPk(resume.id, {
      include: [
        {
          model: ResumeSkill,
          include: [{ model: Skill }]
        },
        { model: WorkExperience },
        { model: Education }
      ]
    });

    res.json({
      success: true,
      data: updatedResume,
      message: 'Resume updated successfully'
    });
  } catch (error) {
    console.error('Error updating resume:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update resume' 
    });
  }
});

// DELETE /api/resumes/:id - Delete resume
router.delete('/:id', auth, async (req, res) => {
  try {
    const resume = await Resume.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id 
      }
    });

    if (!resume) {
      return res.status(404).json({ 
        success: false, 
        error: 'Resume not found' 
      });
    }

    await resume.destroy();

    res.json({
      success: true,
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete resume' 
    });
  }
});

module.exports = router;