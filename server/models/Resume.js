module.exports = (sequelize, DataTypes) => {
  const Resume = sequelize.define('Resume', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    experience_years: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    current_position: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    current_company: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    location: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    salary_expectation: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    resume_file_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'resumes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['is_public']
      },
      {
        fields: ['location']
      }
    ]
  });

  return Resume;
};