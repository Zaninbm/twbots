// ==UserScript==
// @name     Prem Sell Helper
// @namespace   https://*.tribalwars.net
// @namespace   https://*.voynaplemyon.com
// @include     *.voynaplemyon.com*market&mode=exchange*
// @include     *.tribalwars.net*market&mode=exchange*
// @version     0.8
// @grant       GM_xmlhttpRequest
// ==/UserScript==


$(document).ready(function() {

    let scriptInitials = 'PS';
    let scriptFriendlyName = 'Прем Бот';
    let scriptTimerColor = '#D876C4';
    let config = {};

    const maxRate = 850;

    readScreenParams();
    readSessionConfig();
    readSessionState();
    createControls();

    // start loot if enabled
    if (isEnabled()) {
        start();
    }

    function scriptVillageName() {
        return scriptInitials + '.' + config.q.village;
    }

    function readSessionConfig() {
        console.log('Reading session config ...');

        config.session = {};

        let i = 0;
        let prefix = scriptVillageName() + '.';

        while(true) {
            let key = sessionStorage.key(i++);

            if (!key) {
                break;
            }

            // process only current script/village config
            if (key.startsWith(prefix)) {
                let item = key.substr(prefix.length);
                console.log(key + '->' + item);
                config.session[item] = sessionStorage.getItem(key);
            }
        }

        if (!config.session.state) {
            disableSession();
        }

        console.log('Session config read', config.session);
    }

    function saveSessionConfig() {
        console.log('Saving session config ...', config.session);
        let prefix = scriptVillageName() + '.';

        for (let item in config.session) {
            let value = sessionStorage.getItem(prefix + item);
            if (!value || value != config.session[item]) {
                console.log('Saving:', prefix + item, config.session[item]);
                sessionStorage.setItem(prefix + item, config.session[item]);
            } else {
                console.log('Not changed:', prefix + item, config.session[item]);
            }
        }

        console.log('Session config saved');
    }

    function isEnabled() {
        return config.session.state === 'enabled';
    }

    function readSessionState() {
        config.session.state = sessionStorage.getItem('state');
    }

    function saveSessionState() {
        sessionStorage.setItem('state', config.session.state);
    }

    function enableSession() {
        config.session.state = 'enabled';
        saveSessionState();
    }

    function disableSession() {
        config.session.state = 'disabled';
        saveSessionState()
    }

    function createControls() {
        console.log('Creating controls ...');

        let inputs = {};

        let elements = document.querySelectorAll('div.vis');
        console.log(elements);

        // create div
        let controlsDiv = document.createElement('div');
        controlsDiv.className = 'vis';
        elements[0].parentNode.insertBefore(controlsDiv, elements[0].nextSibling);

        let h = document.createElement('h4');
        h.innerHTML = 'Прем Бот';
        controlsDiv.appendChild(h);

        let innerDiv = document.createElement('div');
        controlsDiv.appendChild(innerDiv);

        let table = document.createElement('table');
        table.className = 'vis';
        table.width = '100%';
        innerDiv.appendChild(table);

        let body = document.createElement('tbody');
        table.appendChild(body);

        let tr0 = document.createElement('tr');
        body.appendChild(tr0);

        let tr1 = document.createElement('tr');
        body.appendChild(tr1);

        // columns
        let columns = [
            ['', 'Статус']
        ];

        for (let i = 0; i < columns.length; ++i) {
            let th = document.createElement('th');
            th.style = 'text-align:center';
            th.innerHTML = columns[i][1];
            tr0.appendChild(th);

            let td = document.createElement('td');
            td.align = 'center';
            if (i == 0) {
                td.innerHTML = 'Неактивно.';
                td.style = 'width:30%';
                inputs[columns[i][0]] = td;
            } else {
                let input = document.createElement('select');
                input.innerHTML = columns[i][2];
                input.name = columns[i][0];
                td.appendChild(input);
                inputs[columns[i][0]] = input;

                if (config.session[columns[i][0]]) {
                    console.log('From session', columns[i][0], config.session[columns[i][0]]);
                    input.value = config.session[columns[i][0]];
                } else {
                    console.log('From defaults', columns[i][0]);
                    input.value = columns[i][3];
                }
            }
            tr1.appendChild(td);
        }

        // add buttons

        // save
        let tdb = document.createElement('td');
        tdb.width = '5%';
        tdb.align = 'center';

        let btn = document.createElement('input');
        btn.className = 'btn';
        btn.value = 'Сохранить';
        btn.addEventListener('click', saveSelection, false);
        tdb.appendChild(btn);

        tr0.appendChild(tdb);
        inputs.save = btn;

        // start
        tdb = document.createElement('td');
        tdb.width = '5%';
        tdb.align = 'center';

        btn = document.createElement('input');
        btn.className = 'btn';
        if (!isEnabled()) {
            btn.value = 'Запустить';
            btn.addEventListener('click', activate, false);
        } else {
            btn.value = 'Остановить';
            btn.addEventListener('click', deactivate, false);
        }
        tdb.appendChild(btn);

        tr1.appendChild(tdb);
        inputs.start = btn;

        console.log('Controls created.', inputs);

        config.inputs = inputs;

        // create timers control
        // create div
        let timersDiv = document.createElement('div');
        timersDiv.className = 'vis';
        controlsDiv.after(timersDiv);

        h = document.createElement('h4');
        h.innerHTML = 'Очередь выполнения';
        timersDiv.appendChild(h);

        innerDiv = document.createElement('div');
        controlsDiv.appendChild(innerDiv);

        timersDiv.appendChild(createTimersTable());

    }

    function saveSelection() {
        for (let control in config.inputs) {
            let name = config.inputs[control].name;
            let value = config.inputs[control].value;

            if (name) {
                config.session[name] = value;
            }
        }
        saveSessionConfig();

        // add vilalge to timers list with no delay
        addTimer('Готовность к запуску', pageUrl(), 0, true);
    }

    function pageUrl() {
        let url = 'https://' + window.location.hostname + '/game.php?' + ((config.q.t) ? 't=' + config.q.t + '&': '') + 'village=' + config.q.village + '&screen=market&mode=exchange';
        return url;
    }

    function disablecontrols() {
        // remove divs
        let elements = document.querySelectorAll('div.vis');
        elements[0].remove();

        // disable controls
        for (let control in config.inputs) {
            if (control != 'start') {
                config.inputs[control].readOnly = true;
                config.inputs[control].disabled = true;
            }
        }
        document.getElementsByClassName('btn-premium-exchange-buy')[0].style.display = 'none';
    }

    function start() {

        disablecontrols();

        setStatus('Запусакется ...');

        startProcess(false);
    }

    function activate() {
        saveSelection();
        disablecontrols();

        setStatus('Запусакется ...');
        enableSession();
        loadFirstTimer();
    }

    function deactivate() {
        disableSession();
        window.location.reload();
    }

    function startProcess(wait) {

        let min = wait ? (config.wait - 3) * 60000 : 600;
        let max = wait ? (config.wait + 3) * 60000 : 800;

        let rand = Math.floor(Math.random() * (max - min + 1) + min);
        console.log('Waiting for ' + rand + ' milliseconds ...');
        window.setTimeout(function() {
            processSale();
        }, rand);

        var date = new Date(Date.now() + rand);
        return date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    }

    function waitAndReload(reason, min, max) {

        setStatus(reason);

        let time = Math.floor(Math.random() * (max - min + 1) + min);

        let url = pageUrl();

        // add to timers list
        // load first timer in list
        addTimer(reason, url, time, true);
        loadFirstTimer();
    }

    function processSale() {
        console.log('Processing ...');

        // prices
        let prices = [];
        prices.push(parseInt(document.getElementById('premium_exchange_rate_wood').innerText.split(' ')[1]));
        prices.push(parseInt(document.getElementById('premium_exchange_rate_stone').innerText.split(' ')[1]));
        prices.push(parseInt(document.getElementById('premium_exchange_rate_iron').innerText.split(' ')[1]));
        console.log(prices);

        for (let i = 0; i < 3; i++) {
            if (prices[i] >= maxRate) {
                prices[i] = 100000;
            }
        }

        // find current resources amount
        let capacity = parseInt(document.getElementById('market_merchant_available_count').innerHTML) * 1000;

        if (capacity <= 1000 ) {
            // wait 20 - 30 min
            waitAndReload('No merchants left', 30 * 60000, 45 * 60000);
            return;
        }

        if (capacity > 10000) {
            capacity = 10000;
        } else {
            capacity -= 1000;
        }

        let resources = [];
        resources.push(Math.min(capacity, parseInt(document.getElementById('wood').innerHTML)));
        resources.push(Math.min(capacity, parseInt(document.getElementById('stone').innerHTML)));
        resources.push(Math.min(capacity, parseInt(document.getElementById('iron').innerHTML)));

        // calculate bigger gain
        let max = 0;
        let resource = -1;
        for (let i = 0; i < 3; i++) {
            let gain = parseInt(resources[i] / prices[i]);
            console.log('gain', resources[i], prices[i], gain)
            if (gain > max) {
                max = gain;
                resource = i;
            }
        }
        console.log('max', max, resource);

        if (resource == -1 || max < 2) {
            waitAndReload('Nothing to sell', 30 * 60000, 45 * 60000);
        } else {
            let resNames = ['wood', 'clay', 'iron'];
            setStatus('Selling ' + resNames[resource] + '...');

            let inputNames = ['sell_wood', 'sell_stone', 'sell_iron'];
            document.getElementsByName(inputNames[resource])[0].value = ((resources[resource] - prices[resource]) / 100).toFixed() * 100;

            let calculate = document.getElementsByClassName('btn-premium-exchange-buy')[0];
            let rand = Math.floor(Math.random() * (7000 - 4000 + 1) + 4000);

            window.setTimeout(function() {
                calculate.click();

                window.setTimeout(function() {
                    let confirm = document.getElementsByClassName('btn-confirm-yes')[0];
                    confirm.click();
                    // stays on the same page, try more in 15 - 20 seconds
                    window.setTimeout(function() {
                        waitAndReload('Trying more', 15000, 20000);
                    }, rand);
                }, rand);
            }, rand);
        }
    }

    function setStatus(status) {
        config.inputs[''].innerHTML = status;
    }

    function readScreenParams() {
        console.log('Reading params ...');

        // find sit id and h code
        let elements = document.getElementsByClassName('footer-link');
        for (let i = elements.length - 1; i >= 0; i--) {
            config.q = readQuerryParams(String(elements[i]));
            if (config.q.village) {
                break;
            }
        }

        console.log('Params reading done.', config);
    }

    function readQuerryParams(url) {
        let params = {};
        let hh = url.substring(url.indexOf('?') + 1).split('&');

        // move params into config
        for (let i = 0; i < hh.length; ++i) {
            let param = hh[i].split('=');
            params[param[0]] = param[1];
        }

        return params;
    }

    // timer
    // Bot Name, Village, url, time - Date().getTime();

    let timers;
    let timerTimeout = null;

    readTimers();

/*
    addTimer('1', 'url', 5000);
    addTimer('2', 'url', 10000);
    addTimer('4', 'url', 15000);
    addTimer('0', 'url', 3000);
    addTimer('3', 'url', 12000);
*/
    function readTimers() {
        console.log('Reading timers ...');
        let value = sessionStorage.getItem('BotTimers');
        if (value) {
            timers = JSON.parse(value);
        } else {
            timers = [];
        }

        // timers are stored ordered
        createTimersUi();

        console.log('Timers read', JSON.stringify(timers));
    }

    function saveTimers() {
        console.log('Saving timers ...');
        sessionStorage.setItem('BotTimers', JSON.stringify(timers));
        console.log('Timers saved');
    }

    function addTimer(reason, url, time, unique) {
        console.log('Adding timer', reason, url, time, unique);

        clearTimeout(timerTimeout);

        let newTimer = {
            name: scriptFriendlyName,
            village: document.getElementsByClassName('village')[0].nextSibling.data,
            color: scriptTimerColor,
            reason: reason,
            url: url,
            time: new Date().getTime() + time
        };

        // drop prev timers from the same script+village if requested
        if (unique) {
            for (let i = 0; i < timers.length; ++i) {
                if (timers[i].name == newTimer.name &&
                    timers[i].village == newTimer.village) {
                    timers.splice(i, 1);
                    break;
                }
            }
        }

        // now add to list
        let i = 0;
        for (; i < timers.length; ++i) {
            if (timers[i].time > newTimer.time) {
                break;
            }
        }

        timers.splice(i, 0, newTimer);
        saveTimers();

        createTimersUi();
    }

    function loadFirstTimer() {
        clearTimeout(timerTimeout);

        if (timers.length > 0) {
            let current = timers[0];
            let time = current.time - new Date().getTime();
            if (time <=0) {
                time = 500;
            }
            console.log('Loading timer', current, time);
            timerTimeout = setTimeout(function() {
                console.log('---');
                console.log('Timer', current.name, time);
                // remove from list
                timers.splice(0, 1);
                saveTimers();
                // reload page

                console.log('Reloading to', current.url);
                location.href = current.url;
            }, time);
        }
    }

    function createTimersTable() {
        let table = document.createElement('table');
        table.className = 'vis';
        table.width = '100%';
        table.id = 'bot_timers_table';
        return table;
    }

    function removeTimer(index) {
        clearTimeout(timerTimeout);
        timers.splice(index, 1);
        saveTimers();
        window.location.reload();
    }

    function createTimersUi() {
        console.log('Creating timers UI ...');

        // find table by id
        let table = document.getElementById('bot_timers_table');

        // delete children
        while (table.firstChild) {
            table.removeChild(table.lastChild);
        }

        let body = document.createElement('tbody');
        table.appendChild(body);

        let tr0 = document.createElement('tr');
        body.appendChild(tr0);

        let headers = ['Бот', 'Деревня', 'Причина', 'Время'];

        for (let i = 0; i < headers.length; ++i) {
            let th = document.createElement('th');
            th.style = 'text-align:center';
            th.innerHTML = headers[i];
            tr0.appendChild(th);
        }

        let th = document.createElement('th');
        th.innerHTML = '<img src="https://dsru.innogamescdn.com/asset/34f6b4c7/graphic/delete_small.png" title="" alt="" class="">';
        tr0.appendChild(th);

        // add nodes
        for (let i = 0; i < timers.length; ++i) {
            let tr = document.createElement('tr');
            body.appendChild(tr);

            let timer = timers[i];
            let td = document.createElement('td');
            if (timer.color) { td.style = 'background-color: ' + timer.color; }
            let href = document.createElement('a');
            href.setAttribute('href', timer.url);
            href.innerHTML = timer.name;
            td.appendChild(href);
            tr.appendChild(td);

            td = document.createElement('td');
            td.innerHTML = timer.village;
            if (timer.color) { td.style = 'background-color: ' + timer.color; }
            tr.appendChild(td);

            td = document.createElement('td');
            td.innerHTML = timer.reason;
            if (timer.color) { td.style = 'background-color: ' + timer.color; }
            tr.appendChild(td);

            td = document.createElement('td');
            let date = new Date();
            date.setTime(timer.time);
            td.innerHTML = date.toLocaleTimeString();
            if (timer.color) { td.style = 'background-color: ' + timer.color; }
            tr.appendChild(td);

            td = document.createElement('td');
            td.innerHTML = '<a class="" href="#"><img src="https://dsru.innogamescdn.com/asset/34f6b4c7/graphic/delete_small.png" title="" alt="" class=""></a>';
            if (timer.color) { td.style = 'background-color: ' + timer.color; }
            tr.appendChild(td);
            td.addEventListener('click', function() {removeTimer(i)}, false);
        }
    }

});