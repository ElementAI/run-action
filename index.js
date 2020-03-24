const core = require("@actions/core");

const run = require("./run");

const parseBoolean = (input) => input === "true";
const parseCommand = (commands) => ["/bin/sh", "-ce", commands];
const parseString = (input) => input;
const parseStringArray = (input) => input.split("\n");
const parseTag = (input) => {
  const split = input.indexOf("=");
  return split === -1 ? { key: input } : { key: input.substring(0, split), value: input.substring(split + 1) };
};
const parseTags = (input) => parseStringArray(input).map(parseTag);

const createFields = (fields) => () => {
  const r = Object.entries(fields).reduce((body, [name, field]) => {
    const value = field(name);
    return value === undefined ? body : { ...body, [name]: value };
  }, {});
  return Object.keys(r).length > 0 ? r : undefined;
};

const createField = ({ name, options, parse = parseString } = {}) => (field) => {
  const input = core.getInput(name || field, options);
  return input === "" ? undefined : parse(input);
};

const getJobSpec = createFields({
  // Execution
  command: createField({ name: "commands", parse: parseCommand }),
  data: createField({ parse: parseStringArray }),
  environmentVars: createField({ name: "env", parse: parseStringArray }),
  image: createField({ options: { required: true } }),
  isProcessAgent: createField({ parse: parseBoolean }),
  role: createField(),
  workdir: createField(),

  // Resources
  resources: createFields({
    cpu: createField({ parse: parseFloat }),
    cpuModel: createField(),
    mem: createField({ parse: parseInt }),
    gpu: createField({ parse: parseInt }),
    gpuMem: createField({ parse: parseInt }),
    gpuModel: createField(),
    gpuTensorCores: createField({ parse: parseBoolean }),
    gpuCudaVersion: createField({ parse: parseFloat }),
    inference: createField({ parse: parseBoolean }),
  }),

  // Scheduling
  maxRunTime: createField({ parse: parseInt }),
  preemptable: createField({ parse: parseBoolean }),
  restartable: createField({ parse: parseBoolean }),

  // Identification
  name: createField(),
  tags: createField({ parse: parseTags }),

  // Experimental
  options: createField({ parse: JSON.parse }),
});

(async () => {
  try {
    const jobSpec = getJobSpec();

    const { GITHUB_WORKSPACE: workspace, RUNNER_DATA: runnerData, RUNNER_DIR: runnerDir } = process.env;

    if (workspace !== undefined && runnerData !== undefined) {
      const home = "/home/toolkit";
      const split = workspace.lastIndexOf("/");

      if (jobSpec.environmentVars === undefined) {
        jobSpec.environmentVars = [`HOME=${home}`];
      } else if (!jobSpec.environmentVars.some((env) => env.startsWith("HOME="))) {
        jobSpec.environmentVars.push(`HOME=${home}`);
      }

      if (jobSpec.data === undefined) {
        jobSpec.data = [];
      }
      jobSpec.data.push(`${workspace.substring(0, split).replace(runnerDir, runnerData)}:${home}:rw`);

      if (jobSpec.workdir === undefined) {
        jobSpec.workdir = `${home}${workspace.substring(split)}`;
      }
    }

    await run(jobSpec);
  } catch (error) {
    core.setFailed(error.message);
  }
})();
