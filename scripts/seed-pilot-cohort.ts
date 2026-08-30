import { readFileSync, existsSync } from 'fs';

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_NAMESPACE_ID = process.env.CF_KV_NAMESPACE_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;

async function seedCohort() {
  if (!CF_ACCOUNT_ID || !CF_NAMESPACE_ID || !CF_API_TOKEN) {
    console.error('Missing Cloudflare API credentials in environment.');
    process.exit(1);
  }

  const cohortFilePath = './cohort.json';
  if (!existsSync(cohortFilePath)) {
    console.error(`Cohort file ${cohortFilePath} not found.`);
    process.exit(1);
  }

  // Expects a JSON file mapping Firebase UIDs to enrollment data
  const cohortData = JSON.parse(readFileSync(cohortFilePath, 'utf-8'));

  for (const student of cohortData) {
    const key = `profile:${student.uid}`;
    const value = JSON.stringify({
      studentId: student.uid,
      grade: 12,
      activeSubjects: ['chemistry'],
    });

    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_NAMESPACE_ID}/values/${key}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
      body: value,
    });

    if (response.ok) {
      console.log(`✅ Provisioned: ${student.uid}`);
    } else {
      console.error(`❌ Failed: ${student.uid}`);
    }
  }
}

seedCohort().catch(console.error);
