# Run action

## Set up a runner to run this GitHub Action inside ElementAI Orkestrator
Browse to the GitHub repo and click the `Settings` tab (you need to be an admin of the repo), the `Actions` menu, the `Add runner` button, and finally, the shell command suggested to create the runner (which will copy it to the clipboard).

![Screenshot](https://user-images.githubusercontent.com/8386369/75295966-f6f5d280-57f9-11ea-91a9-6f0ef765c489.png)

Paste it in your shell to `export` it to the environment variable `CONFIG`. Also `export` to `ACCOUNT` the `id` or `fullName` of the account to be used to create the data, role and job. Finally, export to `JOB_NAME` the name to give the job.
```bash
export CONFIG="<command here>"
export ACCOUNT=<account id here>
export JOB_NAME=<job name here>
```

The following commands will create the data, role and job for the runner. You should see the configuration happening, and finally the text `Listening for Jobs`.
```bash
export DATA=$(eai data new $ACCOUNT. --fields id --no-header)
export ROLE=$(eai role new $ACCOUNT. --fields id --no-header)
export ACCOUNT_URN=$(eai account get $ACCOUNT --fields urn --no-header)
eai role policy new $ROLE --action account:get --action job:new --resource $ACCOUNT_URN
eai role policy new $ROLE --action job:get --resource $ACCOUNT_URN:job:\*
export JOB=$(eai job new \
    --account $ACCOUNT \
    -d $DATA:/runner:rw \
    -e "RUNNER_CONFIG='$CONFIG'" \
    -i registry.console.elementai.com/shared.image/github-actions-runner \
    --name $JOB_NAME \
    --restartable \
    --role $ROLE \
    --fields id \
    --no-header)
eai job logs -f $JOB
```

You might need to create new policies for `$ROLE` so your actions can access your image, data, or whatever they need.
