const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'job_board',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Import models
const User = require('./User')(sequelize, DataTypes);
const Resume = require('./Resume')(sequelize, DataTypes);
const Skill = require('./Skill')(sequelize, DataTypes);
const ResumeSkill = require('./ResumeSkill')(sequelize, DataTypes);
const WorkExperience = require('./WorkExperience')(sequelize, DataTypes);
const Education = require('./Education')(sequelize, DataTypes);
const Job = require('./Job')(sequelize, DataTypes);
const Application = require('./Application')(sequelize, DataTypes);
const AIAnalysis = require('./AIAnalysis')(sequelize, DataTypes);

// Define associations
User.hasMany(Resume, { foreignKey: 'user_id', as: 'resumes' });
Resume.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Resume.hasMany(ResumeSkill, { foreignKey: 'resume_id', as: 'resume_skills' });
ResumeSkill.belongsTo(Resume, { foreignKey: 'resume_id' });

Skill.hasMany(ResumeSkill, { foreignKey: 'skill_id' });
ResumeSkill.belongsTo(Skill, { foreignKey: 'skill_id', as: 'skill' });

Resume.hasMany(WorkExperience, { foreignKey: 'resume_id', as: 'work_experience' });
WorkExperience.belongsTo(Resume, { foreignKey: 'resume_id' });

Resume.hasMany(Education, { foreignKey: 'resume_id', as: 'education' });
Education.belongsTo(Resume, { foreignKey: 'resume_id' });

User.hasMany(Job, { foreignKey: 'employer_id', as: 'jobs' });
Job.belongsTo(User, { foreignKey: 'employer_id', as: 'employer' });

Job.hasMany(Application, { foreignKey: 'job_id', as: 'applications' });
Application.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

User.hasMany(Application, { foreignKey: 'applicant_id', as: 'applications' });
Application.belongsTo(User, { foreignKey: 'applicant_id', as: 'applicant' });

Resume.hasMany(Application, { foreignKey: 'resume_id' });
Application.belongsTo(Resume, { foreignKey: 'resume_id', as: 'resume' });

Resume.hasMany(AIAnalysis, { foreignKey: 'resume_id', as: 'ai_analyses' });
AIAnalysis.belongsTo(Resume, { foreignKey: 'resume_id' });

Job.hasMany(AIAnalysis, { foreignKey: 'job_id' });
AIAnalysis.belongsTo(Job, { foreignKey: 'job_id' });

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

// Sync models
const syncModels = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized successfully.');
  } catch (error) {
    console.error('❌ Error synchronizing models:', error);
  }
};

module.exports = {
  sequelize,
  User,
  Resume,
  Skill,
  ResumeSkill,
  WorkExperience,
  Education,
  Job,
  Application,
  AIAnalysis,
  testConnection,
  syncModels
};