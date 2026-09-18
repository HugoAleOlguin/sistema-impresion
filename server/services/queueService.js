const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../config');

const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');
let jobs = [];

// Cargar trabajos previos si existen
try {
  if (fs.existsSync(JOBS_FILE)) {
    jobs = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'));
  }
} catch (err) {
  console.error('Error al cargar jobs.json:', err.message);
  jobs = [];
}

function persistJobs() {
  try {
    fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs.slice(-50), null, 2), 'utf8');
  } catch (err) {
    console.error('Error al persistir jobs.json:', err.message);
  }
}

function createJob(jobData) {
  const newJob = {
    id: 'JOB-' + Date.now().toString().slice(-6),
    createdAt: new Date().toISOString(),
    status: 'pending_approval', // pending_approval | printing | waiting_flip | completed | cancelled | error
    ...jobData
  };

  jobs.unshift(newJob);
  persistJobs();
  return newJob;
}

function getJob(id) {
  return jobs.find(j => j.id === id) || null;
}

function getAllJobs() {
  return jobs;
}

function updateJob(id, updates) {
  const job = getJob(id);
  if (!job) return null;

  Object.assign(job, updates);
  persistJobs();
  return job;
}

function cancelJob(id) {
  const job = getJob(id);
  if (!job) return null;

  job.status = 'cancelled';
  job.cancelledAt = new Date().toISOString();
  persistJobs();
  return job;
}

module.exports = {
  createJob,
  getJob,
  getAllJobs,
  updateJob,
  cancelJob
};

