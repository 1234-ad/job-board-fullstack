import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Box,
  Button,
  Grid,
  TextField,
  Chip,
  IconButton,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Save as SaveIcon,
  Preview as PreviewIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

// API
import { createResume, updateResume, getResume } from '../../services/api';

const steps = [
  'Basic Information',
  'Work Experience', 
  'Education',
  'Skills',
  'Upload Resume',
  'Review'
];

const ResumeBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    experience_years: 0,
    current_position: '',
    current_company: '',
    location: '',
    salary_expectation: '',
    work_experience: [],
    education: [],
    skills: []
  });

  // Load existing resume if editing
  useEffect(() => {
    if (isEditing) {
      loadResume();
    }
  }, [id, isEditing]);

  const loadResume = async () => {
    try {
      setLoading(true);
      const response = await getResume(id);
      setFormData(response.data);
    } catch (error) {
      toast.error('Failed to load resume');
      navigate('/resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addWorkExperience = () => {
    setFormData(prev => ({
      ...prev,
      work_experience: [
        ...prev.work_experience,
        {
          company_name: '',
          position: '',
          start_date: '',
          end_date: '',
          is_current: false,
          description: '',
          location: ''
        }
      ]
    }));
  };

  const updateWorkExperience = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      work_experience: prev.work_experience.map((exp, i) => 
        i === index ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const removeWorkExperience = (index) => {
    setFormData(prev => ({
      ...prev,
      work_experience: prev.work_experience.filter((_, i) => i !== index)
    }));
  };

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [
        ...prev.education,
        {
          institution: '',
          degree: '',
          field_of_study: '',
          start_date: '',
          end_date: '',
          grade: '',
          description: ''
        }
      ]
    }));
  };

  const updateEducation = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map((edu, i) => 
        i === index ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const removeEducation = (index) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const addSkill = (skillName) => {
    if (!skillName.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      skills: [
        ...prev.skills,
        {
          name: skillName.trim(),
          proficiency_level: 'intermediate',
          years_experience: 1,
          category: 'General'
        }
      ]
    }));
  };

  const removeSkill = (index) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  const updateSkill = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.map((skill, i) => 
        i === index ? { ...skill, [field]: value } : skill
      )
    }));
  };

  // File upload handling
  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setResumeFile(file);
      toast.success('Resume file uploaded successfully');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024 // 5MB
  });

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (Array.isArray(formData[key])) {
          submitData.append(key, JSON.stringify(formData[key]));
        } else {
          submitData.append(key, formData[key]);
        }
      });
      
      if (resumeFile) {
        submitData.append('resume_file', resumeFile);
      }

      if (isEditing) {
        await updateResume(id, submitData);
        toast.success('Resume updated successfully!');
      } else {
        await createResume(submitData);
        toast.success('Resume created successfully!');
      }
      
      navigate('/resumes');
    } catch (error) {
      toast.error('Failed to save resume');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Resume Title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Professional Summary"
                value={formData.summary}
                onChange={(e) => handleInputChange('summary', e.target.value)}
                placeholder="Brief overview of your professional background and career objectives..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Years of Experience"
                type="number"
                value={formData.experience_years}
                onChange={(e) => handleInputChange('experience_years', parseInt(e.target.value) || 0)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Current Position"
                value={formData.current_position}
                onChange={(e) => handleInputChange('current_position', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Current Company"
                value={formData.current_company}
                onChange={(e) => handleInputChange('current_company', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Expected Salary"
                type="number"
                value={formData.salary_expectation}
                onChange={(e) => handleInputChange('salary_expectation', e.target.value)}
                InputProps={{
                  startAdornment: <Typography variant="body2" sx={{ mr: 1 }}>₹</Typography>
                }}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Work Experience</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={addWorkExperience}
                variant="outlined"
              >
                Add Experience
              </Button>
            </Box>
            
            {formData.work_experience.map((exp, index) => (
              <Card key={index} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1">Experience {index + 1}</Typography>
                    <IconButton onClick={() => removeWorkExperience(index)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Company Name"
                        value={exp.company_name}
                        onChange={(e) => updateWorkExperience(index, 'company_name', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Position"
                        value={exp.position}
                        onChange={(e) => updateWorkExperience(index, 'position', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Start Date"
                        type="date"
                        value={exp.start_date}
                        onChange={(e) => updateWorkExperience(index, 'start_date', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="End Date"
                        type="date"
                        value={exp.end_date}
                        onChange={(e) => updateWorkExperience(index, 'end_date', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        disabled={exp.is_current}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Location"
                        value={exp.location}
                        onChange={(e) => updateWorkExperience(index, 'location', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Job Description"
                        value={exp.description}
                        onChange={(e) => updateWorkExperience(index, 'description', e.target.value)}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
            
            {formData.work_experience.length === 0 && (
              <Alert severity="info">
                No work experience added yet. Click "Add Experience" to get started.
              </Alert>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Education</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={addEducation}
                variant="outlined"
              >
                Add Education
              </Button>
            </Box>
            
            {formData.education.map((edu, index) => (
              <Card key={index} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1">Education {index + 1}</Typography>
                    <IconButton onClick={() => removeEducation(index)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Institution"
                        value={edu.institution}
                        onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Degree"
                        value={edu.degree}
                        onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Field of Study"
                        value={edu.field_of_study}
                        onChange={(e) => updateEducation(index, 'field_of_study', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Grade/GPA"
                        value={edu.grade}
                        onChange={(e) => updateEducation(index, 'grade', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Start Date"
                        type="date"
                        value={edu.start_date}
                        onChange={(e) => updateEducation(index, 'start_date', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="End Date"
                        type="date"
                        value={edu.end_date}
                        onChange={(e) => updateEducation(index, 'end_date', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Box>
        );

      case 3:
        return (
          <SkillsSection
            skills={formData.skills}
            onAddSkill={addSkill}
            onRemoveSkill={removeSkill}
            onUpdateSkill={updateSkill}
          />
        );

      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Upload Resume File
            </Typography>
            <Paper
              {...getRootProps()}
              sx={{
                p: 4,
                textAlign: 'center',
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <input {...getInputProps()} />
              <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supports PDF, DOC, DOCX files up to 5MB
              </Typography>
              {resumeFile && (
                <Chip
                  label={resumeFile.name}
                  color="primary"
                  sx={{ mt: 2 }}
                />
              )}
            </Paper>
          </Box>
        );

      case 5:
        return (
          <ResumePreview formData={formData} resumeFile={resumeFile} />
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom align="center">
            {isEditing ? 'Edit Resume' : 'Create New Resume'}
          </Typography>
          
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ minHeight: 400 }}>
            {renderStepContent(activeStep)}
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
            >
              Back
            </Button>
            
            <Box>
              {activeStep === steps.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : (isEditing ? 'Update Resume' : 'Create Resume')}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  variant="contained"
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </motion.div>
    </Container>
  );
};

// Skills Section Component
const SkillsSection = ({ skills, onAddSkill, onRemoveSkill, onUpdateSkill }) => {
  const [newSkill, setNewSkill] = useState('');

  const handleAddSkill = () => {
    if (newSkill.trim()) {
      onAddSkill(newSkill);
      setNewSkill('');
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Skills
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          fullWidth
          label="Add Skill"
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
        />
        <Button
          onClick={handleAddSkill}
          variant="contained"
          startIcon={<AddIcon />}
        >
          Add
        </Button>
      </Box>

      <Grid container spacing={2}>
        {skills.map((skill, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1">{skill.name}</Typography>
                  <IconButton onClick={() => onRemoveSkill(index)} color="error" size="small">
                    <DeleteIcon />
                  </IconButton>
                </Box>
                
                <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                  <InputLabel>Proficiency</InputLabel>
                  <Select
                    value={skill.proficiency_level}
                    onChange={(e) => onUpdateSkill(index, 'proficiency_level', e.target.value)}
                  >
                    <MenuItem value="beginner">Beginner</MenuItem>
                    <MenuItem value="intermediate">Intermediate</MenuItem>
                    <MenuItem value="advanced">Advanced</MenuItem>
                    <MenuItem value="expert">Expert</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  fullWidth
                  size="small"
                  label="Years of Experience"
                  type="number"
                  value={skill.years_experience}
                  onChange={(e) => onUpdateSkill(index, 'years_experience', parseInt(e.target.value) || 0)}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

// Resume Preview Component
const ResumePreview = ({ formData, resumeFile }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Resume Preview
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {formData.title}
          </Typography>
          
          <Typography variant="body1" paragraph>
            {formData.summary}
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Experience:</Typography>
              <Typography variant="body2">{formData.experience_years} years</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Location:</Typography>
              <Typography variant="body2">{formData.location}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Current Position:</Typography>
              <Typography variant="body2">{formData.current_position}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Current Company:</Typography>
              <Typography variant="body2">{formData.current_company}</Typography>
            </Grid>
          </Grid>
          
          {formData.skills.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Skills:</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.skills.map((skill, index) => (
                  <Chip
                    key={index}
                    label={`${skill.name} (${skill.proficiency_level})`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}
          
          {resumeFile && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Uploaded File:</Typography>
              <Chip label={resumeFile.name} color="success" />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ResumeBuilder;