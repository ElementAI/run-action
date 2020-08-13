# Run action

## Set up a runner to run this GitHub Action inside ElementAI Orkestrator
Browse to the GitHub repo and click the `Settings` tab (you need to be an admin of the repo), the `Actions` menu, the `Add Runner` button, and finally, the shell command suggested to create the runner (which will copy it to the clipboard).

![Screenshot](https://user-images.githubusercontent.com/8386369/85743778-5691bb00-b6d2-11ea-8755-7cf7b17b9185.png)

Paste it in your shell to save it to the environment variable `CONFIG`. Also save to `ACCOUNT` the `id` or `fullName` of the account to be used to create the data, role and job. Finally, save to `JOB_NAME` the name to give the job.
```bash
CONFIG="<command here>"
ACCOUNT=<account id here>
JOB_NAME=<job name here>
```

The following commands will create the data, role and job for the runner. You should see the configuration happening, and finally the text `Listening for Jobs`.
```bash
DATA=$(eai data new $ACCOUNT. --fields id --no-header)
ACCOUNT_URN=$(eai account get $ACCOUNT --fields urn --no-header)
DATA_URN=$(eai data get $DATA --fields urn --no-header)
ROLE=$(eai role new $ACCOUNT. --policy account:get+job:new@$ACCOUNT_URN,job:get@$ACCOUNT_URN:job:\*,data:\*@$DATA_URN --fields id --no-header)
JOB=$(eai job new \
    --account $ACCOUNT \
    -d $DATA:/runner:rw \
    -e RUNNER_DATA=$DATA \
    -e RUNNER_DIR=/runner \
    -e "RUNNER_CONFIG=$CONFIG" \
    -i registry.console.elementai.com/shared.image/github-actions-runner \
    --name $JOB_NAME \
    --restartable \
    --role $ROLE \
    --fields id \
    --no-header)
eai job logs -f $JOB
```

You might need to create new policies for `$ROLE` so your actions can access your image, data, or whatever they need.

## Example of workflow using this action
```yaml
on: [push]

jobs:
  hello_world_job:
    runs-on: self-hosted
    name: Hello World Job
    steps:
      - name: Hello World Step
        uses: ElementAI/run-action@master
        id: hello
        with:
          image: alpine
          run: |
            echo "$VAR_A $VAR_B from $EAI_CONSOLE_URL"
            ls /data
          data: shared.dataset.coco:/data:ro
          env: |
            VAR_A=Hello
            VAR_B=World
          cpu: 0.1
```
For more information about the available options `with` which run this action, see [action.yml](action.yml).
