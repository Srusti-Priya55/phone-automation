pipeline {
  agent any

  parameters {
    booleanParam(name: 'RUN_ALL', defaultValue: false, description: 'Run all suites')
    // keep your existing booleans here as needed …
    string(name: 'EMAILS', defaultValue: '', description: 'Recipients (comma-separated)')
  }

  environment {
    NODE_HOME = "C:\\Program Files\\nodejs"
    PATH      = "${env.NODE_HOME};${env.PATH}"
  }

  stages {

    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Select suites') {
      steps {
        script {
          def all = [
            'install_adb','install_play','aggregation_check','tnd_check',
            'collection_mode_all','collection_mode_trusted','collection_mode_untrusted',
            'interface_info','ipfix_disable','ipfix_zero','parent_process_check',
            'template_caching_untrusted','before_after_reboot',
            'aup_should_displayed','aup_should_not_displayed','eula_not_accepted',
            'negatives'
          ]
          def chosen = params.RUN_ALL ? all : all.findAll { params[it] }
          if (!chosen) error 'No suites selected — pick at least one or enable RUN_ALL'
          env.CHOSEN = chosen.join(',')
          echo "Suites selected: ${env.CHOSEN}"
        }
      }
    }

    stage('Clean outputs') {
      steps {
        bat '''
          if exist allure-results rmdir /s /q allure-results
          if exist allure-report rmdir /s /q allure-report
          if exist allure-report.offline.html del /f /q allure-report.offline.html
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

    stage('Run suites') {
      steps {
        script {
          def FLOW = [
            install_adb               : 'Install via ADB',
            install_play              : 'Install via Play Store',
            aggregation_check         : 'Aggregation Check',
            tnd_check                 : 'TND Check',
            collection_mode_all       : 'Collection Mode - All',
            collection_mode_trusted   : 'Collection Mode - Trusted',
            collection_mode_untrusted : 'Collection Mode - Untrusted',
            interface_info            : 'Interface Info',
            ipfix_disable             : 'IPFIX Disable',
            ipfix_zero                : 'IPFIX Zero',
            parent_process_check      : 'Parent Process Check',
            template_caching_untrusted: 'Template Caching - Untrusted',
            before_after_reboot       : 'Before/After Reboot',
            aup_should_displayed      : 'AUP Should Display',
            aup_should_not_displayed  : 'AUP Should NOT Display',
            eula_not_accepted         : 'EULA Not Accepted',
            negatives                 : 'Negatives'
          ]

          for (suite in env.CHOSEN.split(',')) {
            def flow = FLOW.get(suite, suite)
            echo "=== RUNNING ${suite} [FLOW=${flow}] ==="
            withEnv(["CURRENT_FLOW=${flow}"]) {
              catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                bat "npx wdio run wdio.conf.ts --suite ${suite}"
              }
            }
          }
        }
      }
    }

    stage('Generate Allure') {
      steps {
        bat '''
          echo ==== Generate Allure ====
          npx allure generate --clean allure-results -o allure-report
          if errorlevel 1 exit /b 1
        '''
      }
    }

    stage('Publish Allure (Jenkins link)') {
      steps {
        script {
          if (fileExists('allure-results')) {
            allure(results: [[path: 'allure-results']])
            echo 'Published Allure results to Jenkins.'
          } else {
            echo 'No allure-results to publish.'
          }
        }
      }
    }

    stage('Make single-file HTML (no server)') {
      steps {
        // Uses your node tool: tools/pack-allure-onehtml.js
        bat '''
          if not exist tools\\pack-allure-onehtml.js (
            echo Missing tools\\pack-allure-onehtml.js & exit /b 1
          )
          node tools\\pack-allure-onehtml.js allure-report
          if errorlevel 1 exit /b 1
          if not exist allure-report\\allure-report.offline.html (
            echo Single HTML was not created & exit /b 1
          )
          copy /y "allure-report\\allure-report.offline.html" ".\\allure-report.offline.html" >nul
        '''
      }
    }

    stage('Publish & Archive') {
      steps {
        archiveArtifacts artifacts: 'allure-results/**, allure-report/**, allure-report.offline.html', fingerprint: true
      }
    }
  }

  post {
    always {
      script {
        if (params.EMAILS?.trim() && fileExists('allure-report.offline.html')) {
          // plain-text body; Jenkins SMTP already configured
          def body = """Build: ${env.BUILD_URL}

Attached: allure-report.offline.html
• Opens on phone or desktop with no server.
"""
          emailext(
            to: params.EMAILS,
            subject: "Mobile Sanity • Build #${env.BUILD_NUMBER} • ${currentBuild.currentResult}",
            mimeType: 'text/plain',
            body: body,
            attachmentsPattern: 'allure-report.offline.html'
          )
        }
      }
    }
  }
}
