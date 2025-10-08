pipeline {
  agent any

  /***********************
   * PARAMETERS
   ***********************/
  parameters {
    booleanParam(name: 'RUN_ALL', defaultValue: false, description: 'Run all suites')
    string(name: 'EMAILS', defaultValue: 'kspriya@cisco.com', description: 'Recipients (comma-separated)')
  }

  /***********************
   * ENVIRONMENT
   ***********************/
  environment {
    NODE_HOME = "C:\\Program Files\\nodejs"
    PATH      = "${env.NODE_HOME};${env.PATH}"
  }

  stages {
    /***********************
     * CHECKOUT
     ***********************/
    stage('Checkout') {
      steps { checkout scm }
    }

    /***********************
     * INSTALL DEPENDENCIES
     ***********************/
    stage('Install dependencies') {
      steps {
        bat '''
          echo Checking Node...
          node -v
          echo Installing npm packages...
          call npm ci
        '''
      }
    }

    /***********************
     * RUN TESTS (WDIO)
     ***********************/
    stage('Run WDIO Suites') {
      steps {
        bat 'npx wdio run wdio.conf.ts'
      }
    }

    /***********************
     * GENERATE ALLURE REPORT
     ***********************/
    stage('Generate Allure') {
      steps {
        bat 'npx allure generate --clean allure-results -o allure-report'
      }
    }

    /***********************
     * MAKE SINGLE-FILE HTML
     ***********************/
    stage('Make single-file HTML') {
      steps {
        powershell '''
          Set-Location "$env:WORKSPACE"
          $script = Join-Path $env:WORKSPACE "tools\\make-allure-offline.ps1"
          if (!(Test-Path $script)) { throw "Helper script not found: $script" }
          & powershell -NoProfile -ExecutionPolicy Bypass -File $script -ReportDir "allure-report" -OutFile "allure-report.single.html"
        '''
      }
    }
  }

  /***********************
   * POST ACTIONS
   ***********************/
  post {
    always {
      /***** 1️⃣ Publish Allure in Jenkins (visible even if tests failed) *****/
      script {
        try {
          if (fileExists('allure-results')) {
            allure(results: [[path: 'allure-results']])
          } else {
            echo '⚠️ No allure-results found.'
          }
        } catch (err) {
          echo "⚠️ Allure publish failed (non-fatal): ${err}"
        }
      }

      /***** 2️⃣ Archive reports for download *****/
      archiveArtifacts artifacts: 'allure-report.single.html, allure-results/**, allure-report/**', fingerprint: true

      /***** 3️⃣ Email the single HTML file only *****/
      script {
        if (params.EMAILS?.trim()) {
          catchError(buildResult: currentBuild.currentResult, stageResult: 'FAILURE') {
            emailext(
              from: 'kspriya@cisco.com',
              to: params.EMAILS,
              subject: "Mobile Sanity Suite • Build #${env.BUILD_NUMBER} • ${currentBuild.currentResult}",
              mimeType: 'text/plain',
              body: """Hi Team,

Result: ${currentBuild.currentResult}

Allure Single HTML attached — can be opened directly (no server required).

Thanks,
Automation Jenkins
""",
              attachmentsPattern: 'allure-report.single.html'
            )
          }
        } else {
          echo '📭 EMAILS parameter empty — skipping email.'
        }
      }
    }
  }
}
