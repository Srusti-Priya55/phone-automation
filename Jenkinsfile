@NonCPS
def addCronTrigger(jobName, cronExpr) {
    def job = jenkins.model.Jenkins.instance.getItemByFullName(jobName)
    if (job == null) {
        println "❌ Job not found: ${jobName}"
        return
    }
    job.triggers.clear()
    def trigger = new hudson.triggers.TimerTrigger(cronExpr)
    trigger.start(job, true)
    job.addTrigger(trigger)
    job.save()
    println "✅ Cron trigger added: ${cronExpr}"
}

pipeline {
  agent any

  parameters {
    choice(name: 'RUN_MODE', choices: ['Run now', 'Schedule'], description: 'Run immediately or schedule')
    choice(name: 'SCHEDULE_TYPE', choices: ['Once', 'Everyday', 'Weekly'], description: 'Schedule type (if Schedule selected)')
    string(name: 'ONCE_DATE', defaultValue: '', description: 'Once: date (YYYY-MM-DD)')
    string(name: 'ONCE_TIME', defaultValue: '', description: 'Once: time (HH:mm)')
    string(name: 'EVERY_TIME', defaultValue: '', description: 'Everyday: time (HH:mm)')
    string(name: 'WEEK_DAYS', defaultValue: '', description: 'Weekly: Mon,Tue,Wed')
    string(name: 'WEEK_TIME', defaultValue: '', description: 'Weekly: time (HH:mm)')
    booleanParam(name: 'RUN_ALL', defaultValue: false, description: 'Run all flows')

    booleanParam(name: 'install_adb', defaultValue: false, description: '')
    booleanParam(name: 'install_play', defaultValue: false, description: '')
    booleanParam(name: 'aggregation_check', defaultValue: false, description: '')
    booleanParam(name: 'tnd_check', defaultValue: false, description: '')
    booleanParam(name: 'collection_mode_all', defaultValue: false, description: '')
    booleanParam(name: 'collection_mode_trusted', defaultValue: false, description: '')
    booleanParam(name: 'collection_mode_untrusted', defaultValue: false, description: '')
    booleanParam(name: 'interface_info', defaultValue: false, description: '')
    booleanParam(name: 'ipfix_disable', defaultValue: false, description: '')
    booleanParam(name: 'ipfix_zero', defaultValue: false, description: '')
    booleanParam(name: 'parent_process_check', defaultValue: false, description: '')
    booleanParam(name: 'template_caching_untrusted', defaultValue: false, description: '')
    booleanParam(name: 'before_after_reboot', defaultValue: false, description: '')
    booleanParam(name: 'aup_should_displayed', defaultValue: false, description: '')
    booleanParam(name: 'aup_should_not_displayed', defaultValue: false, description: '')
    booleanParam(name: 'eula_not_accepted', defaultValue: false, description: '')
    booleanParam(name: 'negatives', defaultValue: false, description: '')
    string(name: 'EMAILS', defaultValue: '', description: 'Recipients (comma-separated)')
  }

  environment {
    NODE_HOME = "C:\\Program Files\\nodejs"
    PATH = "${env.NODE_HOME};${env.PATH}"
  }

  options { timestamps() }

  stages {

    stage('Schedule or Run') {
      steps {
        script {
          if (params.RUN_MODE == 'Schedule') {

            if (params.SCHEDULE_TYPE == 'Once') {
              def now = new Date()
              def sdf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm")
              def target = sdf.parse("${params.ONCE_DATE} ${params.ONCE_TIME}")
              def delay = ((target.time - now.time) / 1000).intValue()
              if (delay < 60) delay = 60
              echo "Scheduling one-time run in ${delay} seconds..."
              bat """
                curl -X POST "http://localhost:8080/job/${env.JOB_NAME}/buildWithParameters" ^
                --user "srusti:117b7e239d09ff5b11e0fc2dbee0cae33f" ^
                --data-urlencode "RUN_MODE=Run now" ^
                --data-urlencode "RUN_ALL=true" ^
                --data-urlencode "delay=${delay}sec"
              """
              currentBuild.result = 'SUCCESS'
              return
            }

            if (params.SCHEDULE_TYPE == 'Everyday') {
              def parts = params.EVERY_TIME.split(':')
              def cronExpr = "${parts[1]} ${parts[0]} * * *"
              echo "Setting Daily trigger: ${cronExpr}"
              addCronTrigger(env.JOB_NAME, cronExpr)
              currentBuild.result = 'SUCCESS'
              return
            }

            if (params.SCHEDULE_TYPE == 'Weekly') {
              def parts = params.WEEK_TIME.split(':')
              def days = params.WEEK_DAYS.toLowerCase()
                .replaceAll('mon','1').replaceAll('tue','2').replaceAll('wed','3')
                .replaceAll('thu','4').replaceAll('fri','5')
                .replaceAll('sat','6').replaceAll('sun','0')
              def cronExpr = "${parts[1]} ${parts[0]} * * ${days}"
              echo "Setting Weekly trigger: ${cronExpr}"
              addCronTrigger(env.JOB_NAME, cronExpr)
              currentBuild.result = 'SUCCESS'
              return
            }
          } else {
            echo "Run now selected — executing immediately."
          }
        }
      }
    }

    stage('Checkout') { steps { checkout scm } }

    stage('Agent sanity') {
      steps {
        bat '''
          echo ===== Agent sanity =====
          where node
          node -v
          where npm
          npm -v
        '''
      }
    }

    stage('Clean outputs') {
      steps {
        bat '''
          if exist allure-results rmdir /s /q allure-results
          if exist allure-report rmdir /s /q allure-report
          if exist allure-report.single.html del /f /q allure-report.single.html
        '''
      }
    }

    stage('Install deps') {
      steps {
        bat '''
          call node -v
          if errorlevel 1 ( echo Node not found & exit /b 1 )
          call npm ci
          if errorlevel 1 exit /b 1
        '''
      }
    }

    stage('Select flows') {
      steps {
        script {
          def all = [
            'install_adb','install_play','aggregation_check','tnd_check',
            'collection_mode_all','collection_mode_trusted','collection_mode_untrusted',
            'interface_info','ipfix_disable','ipfix_zero','parent_process_check',
            'template_caching_untrusted','before_after_reboot',
            'aup_should_displayed','aup_should_not_displayed','eula_not_accepted','negatives'
          ]
          def selected = all.findAll { params[it]?.toString() == 'true' }
          if (params.RUN_ALL) { env.CHOSEN = all.join(',') }
          else if (selected) { env.CHOSEN = selected.join(',') }
          else { error 'No flows selected — pick at least one or enable RUN_ALL' }
          echo "Flows selected: ${env.CHOSEN}"
        }
      }
    }

    stage('Run flows (sequential)') {
      steps {
        script {
          def FLOW = [
            install_adb: 'Install via ADB',
            install_play: 'Install via Play Store'
          ]
          def results = []
          for (suite in env.CHOSEN.split(',')) {
            def flow = FLOW.get(suite, suite)
            echo "=== RUNNING ${suite} ==="
            int code = bat(returnStatus: true, script: "npx wdio run wdio.conf.ts --suite ${suite}")
            results << [name: flow, status: code == 0 ? 'SUCCESS' : 'FAILURE']
          }
          writeFile file: 'suite_results.txt', text: results.collect { "${it.name}|${it.status}" }.join('\n')
        }
      }
    }

    stage('Generate Allure') { steps { bat 'npx allure generate --clean allure-results -o allure-report' } }

    stage('Publish Allure') {
      steps {
        script {
          if (fileExists('allure-results')) allure(results: [[path: 'allure-results']])
        }
      }
    }

    stage('Email & Archive') {
      steps {
        script {
          archiveArtifacts artifacts: 'allure-report/**, allure-report.single.html, suite_results.txt', fingerprint: true
          def recipients = (params.EMAILS ?: '').trim()
          if (recipients) {
            def lines = readFile('suite_results.txt').trim().split(/\r?\n/)
            def rows = lines.collect {
              def parts = it.split('\\|')
              def color = (parts[1] == 'SUCCESS') ? '#16a34a' : '#dc2626'
              "<tr><td>${parts[0]}</td><td style='color:${color}'>${parts[1]}</td></tr>"
            }.join('\n')
            emailext(
              to: recipients,
              subject: "Mobile Sanity Build #${env.BUILD_NUMBER} ${currentBuild.currentResult}",
              mimeType: 'text/html',
              body: """<html><body>
              <p>Status: <b>${currentBuild.currentResult}</b></p>
              <table border='1' cellpadding='5'>${rows}</table>
              <p>Attached: allure-report.single.html</p>
              </body></html>""",
              attachmentsPattern: 'allure-report.single.html'
            )
          }
        }
      }
    }
  }
}
