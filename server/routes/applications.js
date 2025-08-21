const express = require('express');
const router = express.Router();
const { Application, Job, User, Resume } = require('../models');
const { auth, authorize } = require('../middleware/auth');
const { validateApplication } = require('../middleware/validation');

// GET /api/applications - Get user's applications
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { applicant_id: req.user.id };
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const applications = await Application.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title', 'location', 'employment_type', 'salary_min', 'salary_max'],
          include: [
            {
              model: User,
              as: 'employer',
              attributes: ['id', 'first_name', 'last_name', 'profile_image']
            }
          ]
        },
        {
          model: Resume,
          as: 'resume',
          attributes: ['id', 'title']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['applied_at', 'DESC']],
      distinct: true
    });

    res.json({
      success: true,
      data: applications.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(applications.count / limit),
        total_items: applications.count,
        items_per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applications'
    });
  }
});

// GET /api/applications/:id - Get specific application
router.get('/:id', auth, async (req, res) => {
  try {
    const application = await Application.findOne({
      where: { 
        id: req.params.id,
        applicant_id: req.user.id 
      },
      include: [
        {
          model: Job,
          as: 'job',
          include: [
            {
              model: User,
              as: 'employer',
              attributes: ['id', 'first_name', 'last_name', 'email', 'profile_image']
            }
          ]
        },
        {
          model: Resume,
          as: 'resume'
        }
      ]
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    res.json({
      success: true,
      data: application
    });

  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch application'
    });
  }
});

// POST /api/applications - Create new application
router.post('/', auth, authorize('applicant'), validateApplication, async (req, res) => {
  try {
    const { job_id, resume_id, cover_letter } = req.body;

    // Check if job exists and is active
    const job = await Job.findOne({
      where: { 
        id: job_id,
        is_active: true 
      }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found or no longer active'
      });
    }

    // Check if resume belongs to user
    const resume = await Resume.findOne({
      where: { 
        id: resume_id,
        user_id: req.user.id 
      }
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found'
      });
    }

    // Check if user already applied
    const existingApplication = await Application.findOne({
      where: {
        job_id,
        applicant_id: req.user.id
      }
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        error: 'You have already applied to this job'
      });
    }

    // Check application deadline
    if (job.application_deadline && new Date() > new Date(job.application_deadline)) {
      return res.status(400).json({
        success: false,
        error: 'Application deadline has passed'
      });
    }

    // Create application
    const application = await Application.create({
      job_id,
      applicant_id: req.user.id,
      resume_id,
      cover_letter,
      status: 'pending'
    });

    // Fetch complete application data
    const completeApplication = await Application.findByPk(application.id, {
      include: [
        {
          model: Job,
          as: 'job',
          include: [
            {
              model: User,
              as: 'employer',
              attributes: ['id', 'first_name', 'last_name', 'email']
            }
          ]
        },
        {
          model: Resume,
          as: 'resume',
          attributes: ['id', 'title']
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: completeApplication,
      message: 'Application submitted successfully'
    });

  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit application'
    });
  }
});

// PUT /api/applications/:id - Update application (applicant can only update cover letter)
router.put('/:id', auth, async (req, res) => {
  try {
    const application = await Application.findOne({
      where: { 
        id: req.params.id,
        applicant_id: req.user.id 
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Only allow updating cover letter if status is pending
    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update application after it has been reviewed'
      });
    }

    const { cover_letter } = req.body;
    await application.update({ cover_letter });

    const updatedApplication = await Application.findByPk(application.id, {
      include: [
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title']
        },
        {
          model: Resume,
          as: 'resume',
          attributes: ['id', 'title']
        }
      ]
    });

    res.json({
      success: true,
      data: updatedApplication,
      message: 'Application updated successfully'
    });

  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update application'
    });
  }
});

// DELETE /api/applications/:id - Withdraw application
router.delete('/:id', auth, async (req, res) => {
  try {
    const application = await Application.findOne({
      where: { 
        id: req.params.id,
        applicant_id: req.user.id 
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Only allow withdrawal if status is pending
    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Cannot withdraw application after it has been reviewed'
      });
    }

    await application.destroy();

    res.json({
      success: true,
      message: 'Application withdrawn successfully'
    });

  } catch (error) {
    console.error('Error withdrawing application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to withdraw application'
    });
  }
});

// GET /api/applications/job/:jobId - Get applications for a job (employers only)
router.get('/job/:jobId', auth, authorize('employer', 'admin'), async (req, res) => {
  try {
    const { jobId } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    // Verify job belongs to employer
    const job = await Job.findOne({
      where: { 
        id: jobId,
        employer_id: req.user.id 
      }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found or access denied'
      });
    }

    const whereClause = { job_id: jobId };
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const applications = await Application.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'applicant',
          attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'profile_image']
        },
        {
          model: Resume,
          as: 'resume',
          attributes: ['id', 'title', 'summary', 'experience_years', 'current_position', 'current_company', 'location']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['applied_at', 'DESC']],
      distinct: true
    });

    res.json({
      success: true,
      data: applications.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(applications.count / limit),
        total_items: applications.count,
        items_per_page: parseInt(limit)
      },
      job: {
        id: job.id,
        title: job.title
      }
    });

  } catch (error) {
    console.error('Error fetching job applications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applications'
    });
  }
});

// PUT /api/applications/:id/status - Update application status (employers only)
router.put('/:id/status', auth, authorize('employer', 'admin'), async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const application = await Application.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Job,
          as: 'job',
          where: { employer_id: req.user.id }
        }
      ]
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found or access denied'
      });
    }

    await application.update({ 
      status,
      notes: notes || application.notes
    });

    const updatedApplication = await Application.findByPk(application.id, {
      include: [
        {
          model: User,
          as: 'applicant',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'title']
        }
      ]
    });

    res.json({
      success: true,
      data: updatedApplication,
      message: 'Application status updated successfully'
    });

  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update application status'
    });
  }
});

// GET /api/applications/stats - Get application statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    let stats;

    if (req.user.role === 'applicant') {
      // Applicant stats
      const applications = await Application.findAll({
        where: { applicant_id: req.user.id },
        attributes: ['status']
      });

      stats = {
        total: applications.length,
        pending: applications.filter(app => app.status === 'pending').length,
        reviewed: applications.filter(app => app.status === 'reviewed').length,
        shortlisted: applications.filter(app => app.status === 'shortlisted').length,
        rejected: applications.filter(app => app.status === 'rejected').length,
        hired: applications.filter(app => app.status === 'hired').length
      };
    } else if (req.user.role === 'employer') {
      // Employer stats
      const applications = await Application.findAll({
        include: [
          {
            model: Job,
            as: 'job',
            where: { employer_id: req.user.id },
            attributes: []
          }
        ],
        attributes: ['status']
      });

      stats = {
        total: applications.length,
        pending: applications.filter(app => app.status === 'pending').length,
        reviewed: applications.filter(app => app.status === 'reviewed').length,
        shortlisted: applications.filter(app => app.status === 'shortlisted').length,
        rejected: applications.filter(app => app.status === 'rejected').length,
        hired: applications.filter(app => app.status === 'hired').length
      };
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching application stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;