let rawData = [];
let statusChart, robotChart, occupancyChart, processChart, avgTimeChart, faultedJobsChart, jobsPerMonthChart;

function initializeCharts() {
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    const robotCtx = document.getElementById('robotChart').getContext('2d');
    const occupancyCtx = document.getElementById('occupancyChart').getContext('2d');
    const processCtx = document.getElementById('processChart').getContext('2d');

    statusChart = new Chart(statusCtx, {
        type: 'pie',
        data: {
            labels: ['Successful', 'Faulted', 'Stopped'],
            datasets: [{
                label: 'Job Status',
                data: [0, 0, 0],
                backgroundColor: ['#4CAF50', '#F44336', '#FFA500']
            }]
        },
        options: {
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                            let value = context.raw;
                            let percentage = ((value / total) * 100).toFixed(2);
                            return context.label + ': ' + value + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });

    robotChart = new Chart(robotCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Jobs per Robot',
                data: [],
                backgroundColor: '#2196F3'
            }]
        },
        options: {
            scales: {
                x: { beginAtZero: true },
                y: { beginAtZero: true }
            }
        }
    });

    occupancyChart = new Chart(occupancyCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Occupancy Rate (%)',
                data: [],
                backgroundColor: '#FFC107'
            }]
        },
        options: {
            scales: {
                x: { beginAtZero: true },
                y: { beginAtZero: true, max: 100 }
            }
        }
    });

    processChart = new Chart(processCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Jobs per Process',
                data: [],
                backgroundColor: '#9C27B0'
            }]
        },
        options: {
            scales: {
                x: { beginAtZero: true },
                y: { beginAtZero: true }
            }
        }
    });

    const avgTimeCtx = document.getElementById('avgTimeChart').getContext('2d');
    avgTimeChart = new Chart(avgTimeCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Average Time (seconds)',
                data: [],
                backgroundColor: '#FF6384',
            }]
        },
        options: {
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    const faultedJobsCtx = document.getElementById('faultedJobsChart').getContext('2d');
    faultedJobsChart = new Chart(faultedJobsCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Faulted Jobs',
                data: [],
                backgroundColor: '#FF6347'
            }]
        },
        options: {
            scales: {
                x: { beginAtZero: true },
                y: { beginAtZero: true }
            }
        }
    });

    const jobsPerMonthCtx = document.getElementById('jobsPerMonthChart').getContext('2d');
    jobsPerMonthChart = new Chart(jobsPerMonthCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Jobs per Month',
                data: [],
                borderColor: '#4CAF50',
                backgroundColor: 'transparent',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            scales: {
                x: { 
                    beginAtZero: true,
                },
                y: { 
                    beginAtZero: true,
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Jobs: ${context.parsed.y}`;
                        }
                    }
                }
            }
        }
    });
}


function updateMetricsAndCharts(filteredData) {
    const totalJobs = filteredData.length;
    const successfulJobs = filteredData.filter(job => job.State === 'Successful').length;
    const faultedJobs = filteredData.filter(job => job.State === 'Faulted').length;
    const stoppedJobs = filteredData.filter(job => job.State === 'Stopped').length;
    const totalProcesses = [...new Set(filteredData.map(job => job.ReleaseName))].length;
    const totalMachines = [...new Set(filteredData.map(job => job.HostMachineName))].length;

    document.getElementById('totalJobs').innerText = totalJobs;
    document.getElementById('successfulJobs').innerText = successfulJobs;
    document.getElementById('faultedJobs').innerText = faultedJobs;
    document.getElementById('stoppedJobs').innerText = stoppedJobs;
    document.getElementById('totalProcesses').innerText = totalProcesses;
    document.getElementById('totalMachines').innerText = totalMachines;

    statusChart.data.datasets[0].data = [successfulJobs, faultedJobs, stoppedJobs];
    statusChart.update();

    let robotNames = [...new Set(filteredData.map(job => job.HostMachineName))];
    let jobsPerRobot = robotNames.map(robot => filteredData.filter(job => job.HostMachineName === robot).length);

    let robotData = robotNames.map((name, index) => ({ name, jobs: jobsPerRobot[index] }));
    robotData.sort((a, b) => b.jobs - a.jobs);
    robotNames = robotData.map(item => item.name);
    jobsPerRobot = robotData.map(item => item.jobs);

    robotChart.data.labels = robotNames.map(name => name.length > 20 ? name.slice(0, 20) + '...' : name);
    robotChart.data.datasets[0].data = jobsPerRobot;
    robotChart.update();

    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    endDate.setHours(23, 59, 59, 999);

    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const totalHours = totalDays * 24;

    let occupancyRates = robotNames.map(robot => {
        const robotJobs = filteredData.filter(job => job.HostMachineName === robot);
        let robotHours = 0;

        robotJobs.forEach(job => {
            const jobStart = new Date(job.StartTime);
            const jobEnd = new Date(job.EndTime);
            const clampedStart = new Date(Math.max(startDate, jobStart));
            const clampedEnd = new Date(Math.min(endDate, jobEnd));
            const jobDuration = (clampedEnd - clampedStart) / (1000 * 60 * 60);
            robotHours += jobDuration;
        });

        return (robotHours / totalHours) * 100;
    });

    let occupancyData = robotNames.map((name, index) => ({ name, rate: occupancyRates[index] }));
    occupancyData.sort((a, b) => b.rate - a.rate);
    robotNames = occupancyData.map(item => item.name);
    occupancyRates = occupancyData.map(item => item.rate);

    occupancyChart.data.labels = robotNames.map(name => name.length > 20 ? name.slice(0, 20) + '...' : name);
    occupancyChart.data.datasets[0].data = occupancyRates.map(rate => parseFloat(rate.toFixed(2)));
    occupancyChart.update();

    let processNames = [...new Set(filteredData.map(job => job.ReleaseName))];
    let jobsPerProcess = processNames.map(process => filteredData.filter(job => job.ReleaseName === process).length);

    let processData = processNames.map((name, index) => ({ name, jobs: jobsPerProcess[index] }));
    processData.sort((a, b) => b.jobs - a.jobs);
    processNames = processData.map(item => item.name);
    jobsPerProcess = processData.map(item => item.jobs);

    processChart.data.labels = processNames.map(name => name.length > 20 ? name.slice(0, 20) + '...' : name);
    processChart.data.datasets[0].data = jobsPerProcess;
    processChart.update();

    let processTimeSums = {};
    let processCounts = {};

    filteredData.forEach(job => {
        const startTime = new Date(job.StartTime);
        const endTime = new Date(job.EndTime);
        const duration = (endTime - startTime) / 1000;

        if (!processTimeSums[job.ReleaseName]) {
            processTimeSums[job.ReleaseName] = 0;
            processCounts[job.ReleaseName] = 0;
        }
        processTimeSums[job.ReleaseName] += duration;
        processCounts[job.ReleaseName]++;
    });

    let processes = Object.keys(processTimeSums);
    let avgTimes = processes.map(process =>
        processTimeSums[process] / processCounts[process]
    );

    let sortedIndices = avgTimes.map((time, index) => index)
        .sort((a, b) => avgTimes[b] - avgTimes[a]);

    processes = sortedIndices.map(index => processes[index]);
    avgTimes = sortedIndices.map(index => avgTimes[index]);

    const turkishNumberFormat = new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    avgTimeChart.data.labels = processes.map(process =>
        process.length > 20 ? process.slice(0, 20) + '...' : process
    );
    avgTimeChart.data.datasets[0].data = avgTimes.map(time =>
        Math.round(time)
    );

    avgTimeChart.options.scales.x.ticks.callback = function (value) {
        return turkishNumberFormat.format(value);
    };
    avgTimeChart.options.plugins.tooltip.callbacks.label = function (context) {
        let label = context.dataset.label || '';
        if (label) {
            label += ': ';
        }
        if (context.parsed.x !== null) {
            label += turkishNumberFormat.format(Math.round(context.parsed.x));
        }
        return label;
    };
    avgTimeChart.update();

    let faultedJobsPerProcess = {};
    filteredData.filter(job => job.State === 'Faulted').forEach(job => {
        faultedJobsPerProcess[job.ReleaseName] = (faultedJobsPerProcess[job.ReleaseName] || 0) + 1;
    });

    let sortedFaultedJobs = Object.entries(faultedJobsPerProcess)
        .sort((a, b) => b[1] - a[1]);

    faultedJobsChart.data.labels = sortedFaultedJobs.map(([process]) =>
        process.length > 20 ? process.slice(0, 20) + '...' : process
    );
    faultedJobsChart.data.datasets[0].data = sortedFaultedJobs.map(([, count]) => count);
    faultedJobsChart.update();

    let jobsPerMonth = {};
    filteredData.forEach(job => {
        const date = new Date(job.StartTime);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        jobsPerMonth[monthYear] = (jobsPerMonth[monthYear] || 0) + 1;
    });

    let sortedMonths = Object.keys(jobsPerMonth).sort();
    jobsPerMonthChart.data.labels = sortedMonths;
    jobsPerMonthChart.data.datasets[0].data = sortedMonths.map(month => jobsPerMonth[month]);
    jobsPerMonthChart.update();

}


function filterData() {
    const startDateValue = document.getElementById('startDate').value;
    const endDateValue = document.getElementById('endDate').value;

    if (!startDateValue || !endDateValue) {
        return;
    }

    const startDate = new Date(startDateValue);
    const endDate = new Date(endDateValue);
    endDate.setHours(23, 59, 59, 999);

    if (startDate > endDate) {
        alert("Start date cannot be after end date.");
        return;
    }

    const selectedRobots = getSelectedCheckboxValues('robotCheckboxes');
    const selectedProcesses = getSelectedCheckboxValues('processCheckboxes');
    const selectedFolders = getSelectedCheckboxValues('folderCheckboxes');
    const selectedStatuses = getSelectedCheckboxValues('statusCheckboxes');

    let filteredData = rawData.filter(job => {
        const jobStartTime = new Date(job.StartTime);
        const isWithinDateRange = jobStartTime >= startDate && jobStartTime <= endDate;
        const matchesRobot = selectedRobots.length === 0 || selectedRobots.includes(job.HostMachineName);
        const matchesProcess = selectedProcesses.length === 0 || selectedProcesses.includes(job.ReleaseName);
        const matchesFolder = selectedFolders.length === 0 || selectedFolders.includes(job.OrganizationUnitFullyQualifiedName);
        const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(job.State);
        return isWithinDateRange && matchesRobot && matchesProcess && matchesFolder && matchesStatus;
    });

    if (filteredData.length === 0) {
        alert("No results found for the selected filters.");
    }

    updateMetricsAndCharts(filteredData);
}

function getSelectedCheckboxValues(checkboxesId) {
    return Array.from(document.querySelectorAll(`#${checkboxesId} .checkbox-container input[type="checkbox"]:checked`))
        .map(checkbox => checkbox.value);
}

function initializeFilters() {
    const robotCheckboxes = document.querySelector('#robotCheckboxes .checkbox-container');
    const processCheckboxes = document.querySelector('#processCheckboxes .checkbox-container');
    const folderCheckboxes = document.querySelector('#folderCheckboxes .checkbox-container');
    const statusCheckboxes = document.querySelector('#statusCheckboxes .checkbox-container');

    let robots = [...new Set(rawData.map(job => job.HostMachineName))];
    let processes = [...new Set(rawData.map(job => job.ReleaseName))];
    let folders = [...new Set(rawData.map(job => job.OrganizationUnitFullyQualifiedName))];

    robots.sort();
    processes.sort();
    folders.sort();

    function createCheckbox(parent, value, checked = false) {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = value;
        checkbox.checked = checked;
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(value));
        parent.appendChild(label);
    }

    robots.forEach(robot => createCheckbox(robotCheckboxes, robot, false));
    processes.forEach(process => createCheckbox(processCheckboxes, process, false));
    folders.forEach(folder => createCheckbox(folderCheckboxes, folder, false));

    document.querySelectorAll('.checkboxes input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', filterData);
    });

    document.querySelectorAll('.search-box').forEach(searchBox => {
        searchBox.addEventListener('input', function () {
            const checkboxContainer = this.nextElementSibling;
            const searchTerm = this.value.toLowerCase();
            checkboxContainer.querySelectorAll('label').forEach(label => {
                const labelText = label.textContent.toLowerCase();
                label.style.display = labelText.includes(searchTerm) ? '' : 'none';
            });
        });
    });
}


function toggleCheckboxes(checkboxesId) {
    const checkboxes = document.getElementById(checkboxesId);
    const allCheckboxes = document.querySelectorAll('.checkboxes');

    allCheckboxes.forEach(cb => {
        if (cb.id !== checkboxesId) {
            cb.style.display = "none";
        }
    });

    if (checkboxes.style.display === "block") {
        checkboxes.style.display = "none";
    } else {
        checkboxes.style.display = "block";

        const rect = checkboxes.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

        if (rect.bottom > viewportHeight) {
            checkboxes.style.top = 'auto';
            checkboxes.style.bottom = '100%';
        } else {
            checkboxes.style.top = '100%';
            checkboxes.style.bottom = 'auto';
        }
    }
}

function updateChartsTheme() {
    const isDarkTheme = document.body.classList.contains('dark-theme');
    const textColor = isDarkTheme ? '#ffffff' : '#333333';
    const gridColor = isDarkTheme ? '#444444' : '#dddddd';

    Chart.defaults.color = textColor;
    Chart.defaults.borderColor = gridColor;

    [statusChart, robotChart, occupancyChart, processChart, avgTimeChart, faultedJobsChart, jobsPerMonthChart].forEach(chart => {
        if (chart.config.type === 'pie') {
            chart.options.plugins.legend.labels.color = textColor;
        } else {
            chart.options.plugins.legend.labels.color = textColor;
            chart.options.scales.x.grid.color = gridColor;
            chart.options.scales.y.grid.color = gridColor;
            chart.options.scales.x.ticks.color = textColor;
            chart.options.scales.y.ticks.color = textColor;
            chart.options.scales.x.title.color = textColor;
            chart.options.scales.y.title.color = textColor;
        }
        chart.update();
    });
}

function toggleMenu() {
    const sideMenu = document.getElementById('sideMenu');
    const dashboard = document.querySelector('.dashboard');
    if (sideMenu.style.width === '250px') {
        sideMenu.style.width = '0';
        dashboard.classList.remove('menu-open');
    } else {
        sideMenu.style.width = '250px';
        dashboard.classList.add('menu-open');
    }
}



function initializeDashboard() {
    initializeCharts();

    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            rawData = data;
            initializeFilters();

            document.getElementById('startDate').addEventListener('change', filterData);
            document.getElementById('endDate').addEventListener('change', filterData);

            const dates = rawData.flatMap(job => [new Date(job.StartTime), new Date(job.EndTime)]);
            const earliestDate = new Date(Math.min(...dates));
            const latestDate = new Date(Math.max(...dates));

            document.getElementById('startDate').value = earliestDate.toISOString().split('T')[0];
            document.getElementById('endDate').value = latestDate.toISOString().split('T')[0];

            filterData();
        })
        .catch(error => console.error('Error loading data:', error));

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        updateChartsTheme();
    }

    document.getElementById('themeToggle').addEventListener('click', function () {
        document.body.classList.toggle('dark-theme');
        updateChartsTheme();
        
        const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        localStorage.setItem('theme', currentTheme);
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.multiselect')) {
            document.querySelectorAll('.checkboxes').forEach(el => el.style.display = 'none');
        }
    });

    document.querySelectorAll('.checkboxes').forEach(el => {
        el.addEventListener('click', function (e) {
            e.stopPropagation();
        });
    });
}

window.onload = initializeDashboard;