const express = require('express');
const router = express.Router();
const { Job, User, Application, Resume } = require('../models');
const { auth, authorize, optionalAuth } = require('../middleware/auth');
const { validateJob } = require('../middleware/validation');

// GET /api/jobs - Get all jobs (public)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      location,
      employment_type,
      experience_level,
      salary_min,
      salary_max,
      search,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { is_active: true };

    // Apply filters
    if (location) {
      whereClause.location = { [Op.iLike]: `%${location}%` };
    }
    if (employment_type) {
      whereClause.employment_type = employment_type;
    }
    if (experience_level) {
      whereClause.experience_level = experience_level;
    }
    if (salary_min) {
      whereClause.salary_min = { [Op.gte]: salary_min };
    }
    if (salary_max) {
      whereClause.salary_max = { [Op.lte]: salary_max };
    }
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { requirements: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const jobs = await Job.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'employer',
          attributes: ['id', 'first_name', 'last_name', 'profile_image']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]],
      distinct: true
    });

    res.json({
      success: true,
      data: jobs.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(jobs.count / limit),
        total_items: jobs.count,
        items_per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs'
    });
  }
});

// GET /api/jobs/:id - Get specific job
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const job = await Job.findOne({
      where: { 
        id: req.params.id,
        is_active: true 
      },
      include: [
        {
          model: User,
          as: 'employer',
          attributes: ['id', 'first_name', 'last_name', 'profile_image', 'email']
        },
        {
          model: Application,
          as: 'applications',
          attributes: ['id', 'status', 'applied_at'],
          include: [
            {
              model: User,
              as: 'applicant',
              attributes: ['id', 'first_name', 'last_name']
            }
          ]
        }
      ]
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // If user is authenticated, check if they've applied
    let hasApplied = false;
    if (req.user) {
      const application = await Application.findOne({
        where: {
          job_id: job.id,
          applicant_id: req.user.id
        }
      });
      hasApplied = !!application;
    }

    res.json({
      success: true,
      data: {
        ...job.toJSON(),
        has_applied: hasApplied,
        applications_count: job.applications?.length || 0
      }
    });

  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job'
    });
  }
});

// POST /api/jobs - Create new job (employers only)
router.post('/', auth, authorize('employer', 'admin'), validateJob, async (req, res) => {
  try {
    const {
      title,
      description,
      requirements,
      location,
      salary_min,
      salary_max,
      employment_type,
      experience_level,
      application_deadline
    } = req.body;

    const job = await Job.create({
      employer_id: req.user.id,
      title,
      description,
      requirements,
      location,
      salary_min,
      salary_max,
      employment_type,
      experience_level,
      application_deadline
    });

    const jobWithEmployer = await Job.findByPk(job.id, {
      include: [
        {
          model: User,
          as: 'employer',
          attributes: ['id', 'first_name', 'last_name', 'profile_image']
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: jobWithEmployer,
      message: 'Job created successfully'
    });

  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create job'
    });
  }
});

// PUT /api/jobs/:id - Update job (job owner only)
router.put('/:id', auth, authorize('employer', 'admin'), validateJob, async (req, res) => {
  try {
    const job = await Job.findOne({
      where: { 
        id: req.params.id,
        employer_id: req.user.id 
      }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found or access denied'
      });
    }

    await job.update(req.body);

    const updatedJob = await Job.findByPk(job.id, {
      include: [
        {
          model: User,
          as: 'employer',
          attributes: ['id', 'first_name', 'last_name', 'profile_image']
        }
      ]
    });

    res.json({
      success: true,
      data: updatedJob,
      message: 'Job updated successfully'
    });

  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update job'
    });
  }
});

// DELETE /api/jobs/:id - Delete job (job owner only)
router.delete('/:id', auth, authorize('employer', 'admin'), async (req, res) => {
  try {
    const job = await Job.findOne({
      where: { 
        id: req.params.id,
        employer_id: req.user.id 
      }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found or access denied'
      });
    }

    await job.destroy();

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete job'
    });
  }
});

// GET /api/jobs/employer/my-jobs - Get employer's jobs
router.get('/employer/my-jobs', auth, authorize('employer', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { employer_id: req.user.id };
    if (status !== 'all') {
      whereClause.is_active = status === 'active';
    }

    const jobs = await Job.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Application,
          as: 'applications',
          attributes: ['id', 'status', 'applied_at'],
          include: [
            {
              model: User,
              as: 'applicant',
              attributes: ['id', 'first_name', 'last_name']
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      distinct: true
    });

    // Add application counts
    const jobsWithStats = jobs.rows.map(job => ({
      ...job.toJSON(),
      applications_count: job.applications?.length || 0,
      pending_applications: job.applications?.filter(app => app.status === 'pending').length || 0
    }));

    res.json({
      success: true,
      data: jobsWithStats,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(jobs.count / limit),
        total_items: jobs.count,
        items_per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching employer jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs'
    });
  }
});

// POST /api/jobs/:id/toggle-status - Toggle job active status
router.post('/:id/toggle-status', auth, authorize('employer', 'admin'), async (req, res) => {
  try {
    const job = await Job.findOne({
      where: { 
        id: req.params.id,
        employer_id: req.user.id 
      }
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found or access denied'
      });
    }

    await job.update({ is_active: !job.is_active });

    res.json({
      success: true,
      data: job,
      message: `Job ${job.is_active ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('Error toggling job status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle job status'
    });
  }
});

// GET /api/jobs/search/suggestions - Get search suggestions
router.get('/search/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: {
          titles: [],
          locations: [],
          companies: []
        }
      });
    }

    const [titles, locations, companies] = await Promise.all([
      // Job titles
      Job.findAll({
        attributes: ['title'],
        where: {
          title: { [Op.iLike]: `%${q}%` },
          is_active: true
        },
        group: ['title'],
        limit: 5,
        raw: true
      }),
      
      // Locations
      Job.findAll({
        attributes: ['location'],
        where: {
          location: { [Op.iLike]: `%${q}%` },
          is_active: true
        },
        group: ['location'],
        limit: 5,
        raw: true
      }),
      
      // Companies (from employer names)
      Job.findAll({
        attributes: [],
        include: [
          {
            model: User,
            as: 'employer',
            attributes: ['first_name', 'last_name'],
            where: {
              [Op.or]: [
                { first_name: { [Op.iLike]: `%${q}%` } },
                { last_name: { [Op.iLike]: `%${q}%` } }
              ]
            }
          }
        ],
        where: { is_active: true },
        limit: 5,
        raw: true
      })
    ]);

    res.json({
      success: true,
      data: {
        titles: titles.map(t => t.title),
        locations: locations.map(l => l.location).filter(Boolean),
        companies: companies.map(c => `${c['employer.first_name']} ${c['employer.last_name']}`).filter(Boolean)
      }
    });

  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch suggestions'
    });
  }
});

module.exports = router;