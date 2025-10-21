@NonCPS
def addCronTrigger(jobName, cronExpr) {
    def job = jenkins.model.Jenkins.instance.getItemByFullName(jobName)
    if (job == null) {
        println "❌ Job not found: ${jobName}"
        return
    }
    // Clear old triggers
    job.triggers.clear()
    def trigger = new hudson.triggers.TimerTrigger(cronExpr)
    trigger.start(job, true)
    job.addTrigger(trigger)
    job.save()
    println "✅ Cron trigger added for ${jobName}: ${cronExpr}"
}

pipeline {
  agent any

  parameters {
    choice(name: 'RUN_MODE', choices: ['Run now', 'Schedule'], description: 'Run immediately or schedule')
    choice(name: 'SCHEDULE_TYPE', choices: ['Once', 'Everyday', 'Weekly'], description: 'If Schedule selected')
    string(name: 'ONCE_DATE', defaultValue: '', description: 'Once: date (YYYY-MM-DD)')
    string(name: 'ONCE_TIME', defaultValue: '', description: 'Once: time (HH:mm 24h)')
    string(name: 'EVERY_TIME', defaultValue: '', description: 'Everyday: time (HH:mm 24h)')
    string(name: 'WEEK_DAYS', defaultValue: '', description: 'Weekly: Mon,Tue,Wed,Thu,Fri,Sat,Sun')
    string(name: 'WEEK_TIME', defaultValue: '', description: 'Weekly: time (HH:mm 24h)')

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

            // ========== Once ==========
            if (params.SCHEDULE_TYPE == 'Once') {
              if (!params.ONCE_DATE || !params.ONCE_TIME) error "Please provide ONCE_DATE and ONCE_TIME"

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
                --data-urlencode "delay=${delay}sec"
              """
              echo "✅ Job scheduled successfully for ${params.ONCE_DATE} ${params.ONCE_TIME}"
              currentBuild.result = 'SUCCESS'
              return
            }

            // ========== Everyday ==========
            else if (params.SCHEDULE_TYPE == 'Everyday') {
              if (!params.EVERY_TIME) error "Please provide EVERY_TIME"
              def parts = params.EVERY_TIME.split(':')
              def cronExpr = "${parts[1]} ${parts[0]} * * *"
              echo "Setting up Daily trigger: ${cronExpr}"
              addCronTrigger(env.JOB_NAME, cronExpr)
              currentBuild.result = 'SUCCESS'
              return
            }

            // ========== Weekly ==========
            else if (params.SCHEDULE_TYPE == 'Weekly') {
              if (!params.WEEK_DAYS || !params.WEEK_TIME) error "Please provide WEEK_DAYS and WEEK_TIME"
              def parts = params.WEEK_TIME.split(':')
              def days = params.WEEK_DAYS.toLowerCase()
                .replaceAll('mon','1').replaceAll('tue','2').replaceAll('wed','3')
                .replaceAll('thu','4').replaceAll('fri','5').replaceAll('sat','6')
                .replaceAll('sun','0')
              def cronExpr = "${parts[1]} ${parts[0]} * * ${days}"
              echo "Setting up Weekly trigger: ${cronExpr}"
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

    // ===== Rest of your stages (same as before) =====

    stage('Checkout') {
      when { expression { params.RUN_MODE == 'Run now' } }
      steps { checkout scm }
    }

    stage('Agent sanity') {
      when { expression { params.RUN_MODE == 'Run now' } }
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
      when { expression { params.RUN_MODE == 'Run now' } }
      steps {
        bat '''
          if exist allure-results rmdir /s /q allure-results
          if exist allure-report rmdir /s /q allure-report
          if exist allure-report.single.html del /f /q allure-report.single.html
        '''
      }
    }

    stage('Install deps') {
      when { expression { params.RUN_MODE == 'Run now' } }
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
  when { expression { params.RUN_MODE == 'Run now' } }
  steps {
    script {
      def all = [
        'install_adb','install_play','aggregation_check','tnd_check',
        'collection_mode_all','collection_mode_trusted','collection_mode_untrusted',
        'interface_info','ipfix_disable','ipfix_zero','parent_process_check',
        'template_caching_untrusted','before_after_reboot',
        'aup_should_displayed','aup_should_not_displayed','eula_not_accepted','negatives'
      ]
      
      // 🧠 Jenkins sometimes returns null for unchecked booleans — handle that safely
      def selected = all.findAll { params[it]?.toString() == 'true' }

      // 🧩 Allow RUN_ALL to override, or selected to be non-empty
      if (params.RUN_ALL) {
        env.CHOSEN = all.join(',')
        echo "All flows enabled via RUN_ALL"
      } else if (selected) {
        env.CHOSEN = selected.join(',')
        echo "Flows selected: ${env.CHOSEN}"
      } else {
        echo "⚠️ No checkbox selected — skipping execution (auto-triggered build?)"
        currentBuild.result = 'SUCCESS'
        return
      }
    }
  }
}


    stage('Run flows (sequential)') {
      when { expression { params.RUN_MODE == 'Run now' } }
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
            def status = (code == 0) ? 'SUCCESS' : 'FAILURE'
            results << [name: flow, status: status]
            if (code != 0) error "Suite ${suite} failed"
          }
          def lines = results.collect { r -> "${r.name}|${r.status}" }.join('\n')
          writeFile file: 'suite_results.txt', text: lines
        }
      }
    }

    stage('Generate Allure') {
      when { expression { params.RUN_MODE == 'Run now' } }
      steps { bat 'npx allure generate --clean allure-results -o allure-report' }
    }

    stage('Publish Allure') {
      when { expression { params.RUN_MODE == 'Run now' } }
      steps {
        script {
          if (fileExists('allure-results')) allure(results: [[path: 'allure-results']])
        }
      }
    }

    stage('Email & Archive') {
      when { expression { params.RUN_MODE == 'Run now' } }
      steps {
        script {
          archiveArtifacts artifacts: 'allure-report/**, allure-report.single.html, suite_results.txt', fingerprint: true
          def recipients = (params.EMAILS ?: '').trim()
          if (recipients) {
            emailext(
              to: recipients,
              subject: "Mobile Sanity Build #${env.BUILD_NUMBER} ${currentBuild.currentResult}",
              mimeType: 'text/html',
              body: "Automation completed. Attached: allure-report.single.html",
              attachmentsPattern: 'allure-report.single.html'
            )
          }
        }
      }
    }
  }
}
