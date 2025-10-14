pipeline {
    agent any

    parameters {
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

        // 🕒 Scheduling parameters (added)
        choice(name: 'SCHEDULE_OPTION', choices: ['Run Now', 'Schedule Once', 'Recurring Schedule'], description: 'Choose when to run the pipeline')
        string(name: 'SCHEDULE_DATE', defaultValue: '', description: 'Enter date (YYYY-MM-DD) for Schedule Once')
        string(name: 'SCHEDULE_TIME', defaultValue: '09:00', description: 'Enter time (HH:mm)')
        choice(name: 'RECUR_FREQUENCY', choices: ['Daily', 'Weekly'], description: 'Select frequency for recurring schedule')
        choice(name: 'RECUR_DAY', choices: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], description: 'Day for weekly recurring runs')
    }

    environment {
        NODE_HOME = "C:\\Program Files\\nodejs"
        PATH = "${env.NODE_HOME};${env.PATH}"
    }

    options {
        timestamps()
    }

    stages {

        // 🧭 Handle scheduling logic (added)
        stage('Handle Schedule Option') {
            steps {
                script {
                    def option = params.SCHEDULE_OPTION
                    echo "Selected scheduling option: ${option}"

                    if (option == 'Run Now') {
                        echo "Executing immediately..."
                    }
                    else if (option == 'Schedule Once') {
                        if (!params.SCHEDULE_DATE?.trim()) {
                            error "Please specify SCHEDULE_DATE for Schedule Once."
                        }

                        def cronTime = params.SCHEDULE_TIME.split(':')
                        def hour = cronTime[0]
                        def minute = cronTime[1]
                        def dateParts = params.SCHEDULE_DATE.split('-')
                        def day = dateParts[2]
                        def month = dateParts[1]

                        def cronExpr = "${minute} ${hour} ${day} ${month} *"
                        echo "Scheduling one-time build with cron: ${cronExpr}"

                        properties([
                            pipelineTriggers([cron(cronExpr)])
                        ])
                        currentBuild.result = 'SUCCESS'
                        error "Scheduled build created — exiting current run."
                    }
                    else if (option == 'Recurring Schedule') {
                        def cronTime = params.SCHEDULE_TIME.split(':')
                        def hour = cronTime[0]
                        def minute = cronTime[1]
                        def cronExpr = ''

                        if (params.RECUR_FREQUENCY == 'Daily') {
                            cronExpr = "${minute} ${hour} * * *"
                        } else if (params.RECUR_FREQUENCY == 'Weekly') {
                            def dayMap = [
                                Monday: '1', Tuesday: '2', Wednesday: '3',
                                Thursday: '4', Friday: '5', Saturday: '6', Sunday: '0'
                            ]
                            cronExpr = "${minute} ${hour} * * ${dayMap[params.RECUR_DAY]}"
                        }

                        echo "Scheduling recurring build with cron: ${cronExpr}"
                        properties([
                            pipelineTriggers([cron(cronExpr)])
                        ])
                        currentBuild.result = 'SUCCESS'
                        error "Recurring schedule created — exiting current run."
                    }
                }
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
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

                    def chosen = params.RUN_ALL ? all : all.findAll { params[it] }
                    if (!chosen) error 'No flows selected — pick at least one or enable RUN_ALL'

                    env.CHOSEN = chosen.join(',')
                    echo "Flows selected: ${env.CHOSEN}"
                }
            }
        }

        stage('Run flows (sequential)') {
            steps {
                script {
                    def FLOW = [
                        install_adb : 'Install via ADB',
                        install_play : 'Install via Play Store',
                        aggregation_check : 'Aggregation Check',
                        tnd_check : 'TND Check',
                        collection_mode_all : 'Collection Mode - All',
                        collection_mode_trusted : 'Collection Mode - Trusted',
                        collection_mode_untrusted : 'Collection Mode - Untrusted',
                        interface_info : 'Interface Info',
                        ipfix_disable : 'IPFIX Disable',
                        ipfix_zero : 'IPFIX Zero',
                        parent_process_check : 'Parent Process Check',
                        template_caching_untrusted: 'Template Caching - Untrusted',
                        before_after_reboot : 'Before/After Reboot',
                        aup_should_displayed : 'AUP Should Display',
                        aup_should_not_displayed : 'AUP Should NOT Display',
                        eula_not_accepted : 'EULA Not Accepted',
                        negatives : 'Negatives'
                    ]

                    def results = []
                    for (suite in env.CHOSEN.split(',')) {
                        def flow = FLOW.get(suite, suite)
                        echo "=== RUNNING ${suite} [FLOW=${flow}] ==="
                        int code = 1
                        withEnv(["CURRENT_FLOW=${flow}"]) {
                            catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                                code = bat(returnStatus: true, script: "npx wdio run wdio.conf.ts --suite ${suite}")
                                if (code != 0) {
                                    error "Suite ${suite} failed"
                                }
                            }
                        }
                        def status = (code == 0) ? 'SUCCESS' : 'FAILURE'
                        results << [name: flow, status: status]
                    }

                    def lines = results.collect { r -> "${r.name}|${r.status}" }.join('\n')
                    writeFile file: 'suite_results.txt', text: lines
                }
            }
        }

        stage('Generate Allure') {
            steps {
                bat '''
                echo ==== Generate Allure ====
                if not exist allure-results ( echo No allure-results found & exit /b 1 )
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
                        echo 'No allure-results to publish.'
                    }
                }
            }
        }

        stage('Make single-file HTML (no server)') {
            steps {
                bat '''
                echo ==== Build single HTML ====
                if not exist tools\\pack-allure-onehtml.js ( echo Missing tools\\pack-allure-onehtml.js & exit /b 1 )
                if not exist allure-report\\index.html ( echo Missing allure-report\\index.html & exit /b 1 )
                node tools\\pack-allure-onehtml.js allure-report
                if not exist allure-report\\allure-report.offline.html ( echo Single HTML not created & dir allure-report & exit /b 1 )
                copy /y "allure-report\\allure-report.offline.html" "allure-report.single.html" >nul
                echo Created: allure-report.single.html
                '''
            }
        }

        stage('Publish & Archive') {
            steps {
                script {
                    archiveArtifacts artifacts: 'allure-results/**, allure-report/**, tools/**, allure-report.single.html, suite_results.txt', fingerprint: true

                    def recipients = (params.EMAILS ?: '').trim()
                    if (recipients) {
                        def perSuiteHtml = ''
                        if (fileExists('suite_results.txt')) {
                            def lines = readFile('suite_results.txt').trim().split(/\r?\n/)
                            def rows = lines.collect { line ->
                                def parts = line.split('\\|', 2)
                                def name = parts[0]
                                def status = parts.size() > 1 ? parts[1] : ''
                                def color = (status == 'SUCCESS') ? '#16a34a' : '#dc2626'
                                """<tr><td>${name}</td><td style='color:${color}'>${status}</td></tr>"""
                            }.join('\n')
                            perSuiteHtml = "<table border='1' cellspacing='0' cellpadding='5'><tr><th>Test</th><th>Status</th></tr>${rows}</table>"
                        }

                        def status = currentBuild.currentResult
                        def statusColor = (status == 'SUCCESS') ? '#16a34a' : '#dc2626'

                        emailext(
                            to: recipients,
                            subject: "Mobile Sanity Build #${env.BUILD_NUMBER} ${status}",
                            mimeType: 'text/html',
                            body: """
                                <p>Hi Team,</p>
                                <p>This is an automated build status update from the Mobile Automation Suite.</p>
                                <p><b>Status:</b> <span style='color:${statusColor}'>${status}</span></p>
                                <p><b>Executed On:</b> ${new Date().format("yyyy-MM-dd HH:mm:ss")}</p>
                                <p><b>Duration:</b> ${currentBuild.durationString.replace(' and counting', '')}</p>
                                <p><b>Executed Test Cases:</b></p>
                                <pre>${params.RUN_ALL ? 'All test cases executed (RUN_ALL selected)' :
                                    (params.collect { k, v -> v && k != 'RUN_ALL' && k != 'EMAILS' ? " - ${k}" : null }
                                    .findAll { it != null }.join('\n'))}</pre>
                                ${perSuiteHtml}
                                <p><b>Attached:</b> allure-report.single.html</p>
                            """,
                            attachmentsPattern: 'allure-report.single.html'
                        )
                    } else {
                        echo 'EMAILS empty — skipping email.'
                    }
                }
            }
        }
    }
}
