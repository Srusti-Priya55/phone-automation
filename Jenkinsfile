pipeline {
  agent any

  /***********************
   * PARAMETERS
   ***********************/
  parameters {
    booleanParam(name: 'RUN_ALL', defaultValue: true, description: 'Run all suites')
    // keep your existing booleans if you want to select subsets; showing minimal here:
    string(name: 'EMAILS', defaultValue: '', description: 'Recipients (comma-separated)')
  }

  /***********************
   * ENV
   ***********************/
  environment {
    NODE_HOME = "C:\\Program Files\\nodejs"
    PATH      = "${env.NODE_HOME};${env.PATH}"
  }

  options {
    timestamps()
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

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

    stage('Select suites') {
      steps {
        script {
          // If you want the checkbox matrix, re-add your map logic here.
          // For now: always run your default entry (e.g., collection_mode_trusted)
          env.CHOSEN = params.RUN_ALL ? 'collection_mode_trusted' : 'collection_mode_trusted'
          echo "Suites selected: ${env.CHOSEN}"
        }
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
          if errorlevel 1 (echo Node not found & exit /b 1)
          call npm ci
          if errorlevel 1 exit /b 1
        '''
      }
    }

    stage('Run WDIO') {
      steps {
        script {
          // run your suite(s). Keep going even if tests fail, so we still get reports.
          catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
            bat 'npx wdio run wdio.conf.ts --suite collection_mode_trusted'
          }
        }
      }
    }

    stage('Generate Allure') {
      steps {
        bat '''
          echo ==== Generate Allure ====
          npx allure generate --clean allure-results -o allure-report
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
            error 'allure-results not found — cannot publish Allure link.'
          }
        }
      }
    }

    stage('Make single-file HTML (no server)') {
      steps {
        // Build a one-file HTML using Edge in headless mode against file:///.../index.html
        powershell '''
          $ErrorActionPreference = "Stop"

          # 1) Find Edge
          $edge = "$Env:ProgramFiles(x86)\\Microsoft\\Edge\\Application\\msedge.exe"
          if (-not (Test-Path $edge)) { $edge = "$Env:ProgramFiles\\Microsoft\\Edge\\Application\\msedge.exe" }
          if (-not (Test-Path $edge)) { throw "Microsoft Edge not found. Install Edge on this agent." }
          Write-Host "Using Edge at: $edge"

          # 2) Build file:// URL to Allure index.html
          $idxPath = (Resolve-Path ".\\allure-report\\index.html").Path
          $fileUrl = "file:///" + ($idxPath -replace "\\\\","/")

          # 3) Run single-file-cli via npx (Edge headless, allow file access)
          $args = @(
            "--yes", "--package", "single-file-cli@2.0.75", "single-file",
            $fileUrl,
            "-o", "allure-report.single.html",
            "--browser-executable-path", $edge,
            "--browser-headless", "true",
            "--browser-arg", "--headless=new",
            "--browser-arg", "--disable-gpu",
            "--browser-arg", "--allow-file-access-from-files",
            "--browser-wait-until", "networkIdle",
            "--browser-wait-until-delay", "1500",
            "--block-scripts", "false",
            "--self-extracting-archive", "true",
            "--resolve-links", "false"
          )

          Write-Host "Running npx with arguments:`n$($args -join ' ')"
          $p = Start-Process -FilePath "npx" -ArgumentList $args -NoNewWindow -Wait -PassThru
          if ($p.ExitCode -ne 0) {
            throw "single-file-cli failed with exit code $($p.ExitCode)"
          }

          if (-not (Test-Path "allure-report.single.html")) {
            throw "Single HTML not created: allure-report.single.html"
          }

          $size = (Get-Item "allure-report.single.html").Length
          Write-Host ("Created allure-report.single.html ({0} bytes)" -f $size)
        '''
      }
    }

    stage('Publish & Archive') {
      steps {
        script {
          def patterns = 'allure-results/**, allure-report/**, allure-report.single.html'
          archiveArtifacts artifacts: patterns, fingerprint: true
          echo "Archived: ${patterns}"
        }
      }
    }
  }

  post {
    always {
      script {
        // Send email only if recipients provided
        if (params.EMAILS?.trim()) {
          // Attach the single-file HTML if it exists; otherwise send body only
          def attach = fileExists('allure-report.single.html') ? 'allure-report.single.html' : ''
          def resultLine = "Result: ${currentBuild.currentResult}\n"
          def body = """Hi Team,

Allure link is available on the Jenkins build page (if you are on VPN/LAN).

Attached (if present):
- allure-report.single.html  (one file, opens offline on phone/desktop)

Build: ${env.BUILD_URL}

Thanks,
Automation
"""

          catchError(buildResult: currentBuild.currentResult, stageResult: 'FAILURE') {
            emailext(
              to: params.EMAILS,
              subject: "Mobile Sanity Suite • Build #${env.BUILD_NUMBER} • ${currentBuild.currentResult}",
              mimeType: 'text/plain',
              body: resultLine + body,
              attachmentsPattern: attach
            )
          }
        } else {
          echo 'EMAILS not provided — skipping email.'
        }
      }
    }
  }
}
