const fetch = require("node-fetch");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createMessage = async (response) => {
  const message = await response.text();
  let status;
  try {
    const { error } = JSON.parse(message);
    status = `${error.code} ${error.status}`;
    message = error.message;
  } catch {
    status = response.status;
  }
  return `${status}, ${message}`;
};

module.exports = async function(body) {
  const consoleURL = process.env.EAI_CONSOLE_URL;

  const tokenURL = new URL(consoleURL);
  tokenURL.hostname = `token.${tokenURL.hostname}`;

  let response = await fetch(tokenURL);
  if (response.status !== 200) {
    throw new Error(`Failed to get token: ${await createMessage(response)}`);
  }
  const bearer = await response.text();
  const authorization = `Bearer ${bearer}`;

  console.log(`Submitting job with`, body);
  response = await fetch(`${consoleURL}/v1/job`, {
    method: "POST",
    headers: {
      authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (response.status !== 201) {
    throw new Error(`Failed to submit the job: ${await createMessage(response)}`);
  }
  let job = await response.json();
  console.log(`Successfully submitted job id ${job.id}`);

  let delay = 5000;
  let nextDelay = 1000;
  while (job.alive) {
    console.log(`Job ${job.state.toLowerCase()}, waiting ${delay / 1000} s`);
    await sleep(delay);

    response = await fetch(`${consoleURL}/v1/job/${job.id}`, { headers: { authorization } });
    if (response.status !== 200) {
      throw new Error(`Failed to get job ${job.id}: ${await createMessage(response)}`);
    }
    job = await response.json();

    delay = nextDelay;
    nextDelay *= 2;
  }

  response = await fetch(`${consoleURL}/v1/job/${job.id}/logs`, { headers: { authorization } });
  if (response.status === 200) {
    const log = await response.text();
    console.log(log);
  } else if (response.status !== 204) {
    throw new Error(`Failed to get job ${job.id} logs: ${await createMessage(response)}`);
  }

  if (job.state !== "SUCCEEDED") {
    const latestRun = job.runs[job.runs.length - 1];
    throw new Error(`Job ${job.state.toLowerCase()} with exit code ${latestRun.exitCode}, ${job.stateInfo}`);
  }
};
