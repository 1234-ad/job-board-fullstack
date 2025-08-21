const Joi = require('joi');

// User registration validation
const validateRegistration = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required'
    }),
    first_name: Joi.string().min(2).max(50).required().messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required'
    }),
    last_name: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required'
    }),
    phone: Joi.string().pattern(/^[+]?[1-9][\d\s\-\(\)]{7,15}$/).optional().messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
    role: Joi.string().valid('applicant', 'employer').optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
};

// User login validation
const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
};

// Resume validation
const validateResume = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().min(5).max(200).required().messages({
      'string.min': 'Resume title must be at least 5 characters long',
      'string.max': 'Resume title cannot exceed 200 characters',
      'any.required': 'Resume title is required'
    }),
    summary: Joi.string().max(1000).optional().messages({
      'string.max': 'Summary cannot exceed 1000 characters'
    }),
    experience_years: Joi.number().integer().min(0).max(50).optional().messages({
      'number.min': 'Experience years cannot be negative',
      'number.max': 'Experience years cannot exceed 50'
    }),
    current_position: Joi.string().max(200).optional().messages({
      'string.max': 'Current position cannot exceed 200 characters'
    }),
    current_company: Joi.string().max(200).optional().messages({
      'string.max': 'Current company cannot exceed 200 characters'
    }),
    location: Joi.string().max(200).optional().messages({
      'string.max': 'Location cannot exceed 200 characters'
    }),
    salary_expectation: Joi.number().positive().optional().messages({
      'number.positive': 'Salary expectation must be a positive number'
    }),
    skills: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        proficiency_level: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').optional(),
        years_experience: Joi.number().integer().min(0).optional(),
        category: Joi.string().optional()
      })
    ).optional(),
    work_experience: Joi.array().items(
      Joi.object({
        company_name: Joi.string().required(),
        position: Joi.string().required(),
        start_date: Joi.date().required(),
        end_date: Joi.date().optional(),
        is_current: Joi.boolean().optional(),
        description: Joi.string().optional(),
        location: Joi.string().optional()
      })
    ).optional(),
    education: Joi.array().items(
      Joi.object({
        institution: Joi.string().required(),
        degree: Joi.string().required(),
        field_of_study: Joi.string().optional(),
        start_date: Joi.date().optional(),
        end_date: Joi.date().optional(),
        grade: Joi.string().optional(),
        description: Joi.string().optional()
      })
    ).optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
};

// Job validation
const validateJob = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string().min(5).max(200).required().messages({
      'string.min': 'Job title must be at least 5 characters long',
      'string.max': 'Job title cannot exceed 200 characters',
      'any.required': 'Job title is required'
    }),
    description: Joi.string().min(50).required().messages({
      'string.min': 'Job description must be at least 50 characters long',
      'any.required': 'Job description is required'
    }),
    requirements: Joi.string().optional(),
    location: Joi.string().max(200).optional().messages({
      'string.max': 'Location cannot exceed 200 characters'
    }),
    salary_min: Joi.number().positive().optional().messages({
      'number.positive': 'Minimum salary must be a positive number'
    }),
    salary_max: Joi.number().positive().optional().messages({
      'number.positive': 'Maximum salary must be a positive number'
    }),
    employment_type: Joi.string().valid('full-time', 'part-time', 'contract', 'internship').optional(),
    experience_level: Joi.string().valid('entry', 'mid', 'senior', 'executive').optional(),
    application_deadline: Joi.date().greater('now').optional().messages({
      'date.greater': 'Application deadline must be in the future'
    })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  // Validate salary range
  if (req.body.salary_min && req.body.salary_max && req.body.salary_min > req.body.salary_max) {
    return res.status(400).json({
      success: false,
      error: 'Minimum salary cannot be greater than maximum salary'
    });
  }

  next();
};

// Application validation
const validateApplication = (req, res, next) => {
  const schema = Joi.object({
    job_id: Joi.number().integer().positive().required().messages({
      'number.positive': 'Job ID must be a positive number',
      'any.required': 'Job ID is required'
    }),
    resume_id: Joi.number().integer().positive().required().messages({
      'number.positive': 'Resume ID must be a positive number',
      'any.required': 'Resume ID is required'
    }),
    cover_letter: Joi.string().max(2000).optional().messages({
      'string.max': 'Cover letter cannot exceed 2000 characters'
    })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
};

// Generic validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    next();
  };
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateResume,
  validateJob,
  validateApplication,
  validate
};