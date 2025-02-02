/**************************
* Prüft ob im Internet eine neue Firmware verfügbar ist
* https://github.com/Baenker/Pruefung-CCU-Firmware
* 
* 19.03.19 V1.00    Erste Version
* 20.03.19 V1.01    Logging optimiert
* 01.04.19 V1.02    Firmware kann auch für Rasperrymatic überwacht werden
*                   Umstellung von var auf const und let (by Dutchman)
* 01.04.19 V1.03    kleinere Anpassungen
* 03.04.19 V1.04    Firmware kann nun für piVCCU, piVCCU3 und debimatic übverwacht werden und zwar jeweils mit latest oder testing
*                   Bugfix Variable Version_Internet
*                   Logging optimiert und für Debugging erweitert
* 04.04.19 V1.05    Link zu Github aufgenommen
*                   Rechtschreibfehler korrigiert 
* 11.05.19 V1.06    Fehler behoben wenn Version im Internet nicht abgefragt werden kann
* 24.05.19 V1.07    Fehler behoben wenn Version im Internet nicht abgefragt werden kann (wirklich :-)
*                   Beim Buxfix vom 11.05 wäre nur die Push unterdrückt worden. Logeinträge wären aber fehlerhaft gewesen
* 27.05.19 V1.08    Log eingefügt da Script mit Änderungen vom 24.05.19 abstürtzt wenn der Abruf aus dem Internet nicht funktioniert
* 06.06.19 V1.09    Fehler versucht mit Abfrage isNAN zu unterdrücken
**************************/
const logging = true; 
const debugging = false; 
const debugging_response = false;       //nur im Fehlerfall auf true. Hiermit wird die Antwort der Internetadresse protokolliert
const CCU_Version = 2;                  //Hier eine Zahl eintragen: 2 = CCU2 // 3 = CCU3 // 4 = Rasperrymatic // 5= pivccu2 lastest 
//= 6 pivccu3 latest // 7 = debimatic = latest bzw 51, 61 bzw 71 für die jeweilige Testing Version
//Datenpunkt auswählen wo die installierte Version ersichtlich ist (aus Homematic.Rega Adapter)
const id_Version_installiert = "hm-rega.0.MEQ0228930.0.FIRMWARE_VERSION"/*hm-rega.0.MEQ0228930.0.FIRMWARE_VERSION*/;
//Datenpunkt muss manuell angelegt werden. Kann irgendwo angelegt werden. Anschließend hier ersetzen
const id_Version_Internet = 'Systemvariable.0.Servicemeldungen.Verfuegbare_CCU-Firmware'/*Verfuegbare CCU-Firmware*/;

const observation = true;         //Dauerhafte Überwachung der Firmware (true = aktiv // false =inaktiv)
const onetime = true;             //Prüft beim Scriptstart auf aktuelle Firmware

//Prio für Pushover
const prio_Firmware = 0;


//Variablen für Pushover
const sendpush = true;            //true = verschickt per Pushover Nachrchten // false = Pushover wird nicht benutzt
const pushover_Instanz0 =  'pushover.0';     // Pushover instance für Pio = 0
const pushover_Instanz1 =  'pushover.1';     // Pushover instance für Pio = 1
const pushover_Instanz2 =  'pushover.2';     // Pushover instance für Pio = 2
const pushover_Instanz3 =  'pushover.3';     // Pushover instance für Pio = -1 oder -2
let _prio;
let _titel;
let _message;
const _device = 'TPhone';         //Welches Gerät soll die Nachricht bekommen
//const _device = 'All'; 

//Variablen für Telegram
const sendtelegram = false;            //true = verschickt per Telegram Nachrchten // false = Telegram wird nicht benutzt
const user_telegram = '';             //User der die Nachricht bekommen soll

//Variable zum verschicken der Servicemeldungen per eMail
const sendmail = false;            //true = verschickt per email Nachrchten // false = email wird nicht benutzt


// ab hier keine Änderung

let _message_tmp;
const request = require('request');

function send_pushover_V4 (_device, _message, _titel, _prio) {
        let pushover_Instanz;
        if (_prio === 0){pushover_Instanz =  pushover_Instanz0}
        else if (_prio == 1){pushover_Instanz =  pushover_Instanz1}
        else if (_prio == 2){pushover_Instanz =  pushover_Instanz2}
        else {pushover_Instanz =  pushover_Instanz3}
        sendTo(pushover_Instanz, { 
        device: _device,
        message: _message, 
        title: _titel, 
        priority: _prio,
        retry: 60,
        expire: 600,
        html: 1
    }); 
}

function send_telegram (_message, user_telegram) {
    sendTo('telegram.0', { 
        text: _message,
        user: user_telegram,
        parse_mode: 'HTML'
    }); 
}

function send_mail (_message) {
    sendTo("email", {
        //from:    "iobroker@mydomain.com",
        //to:      "aabbcc@gmail.com",
        subject: "Servicemeldung",
        text:    _message
    });
}

function func_Version(){
    const ccu2 = 'http://update.homematic.com/firmware/download?cmd=js_check_version&version=12345&product=HM-CCU2&serial=12345';
    const ccu3 = 'http://update.homematic.com/firmware/download?cmd=js_check_version&version=12345&product=HM-CCU3&serial=12345';
    const Raspi = 'https://gitcdn.xyz/repo/jens-maus/RaspberryMatic/master/release/LATEST-VERSION.js?_version_=CURRENT_VERSION';
    const pivccu2 = 'https://www.pivccu.de/pivccu.latestVersion?serial=ioBroker';
    const pivccu3 = 'https://www.pivccu.de/pivccu3.latestVersion?serial=ioBroker';
    const debimatic = 'https://www.debmatic.de/latestVersion?serial=ioBroker';
    const testing_pivccu = 'https://www.pivccu.de/pivccu.latestVersion?serial=ioBroker';
    const testing_pivccu3 = 'https://www.pivccu.de/pivccu3.latestVersion?serial=ioBroker';
    const testing_debimatic = 'https://www.debmatic.de/latestVersion?serial=ioBroker';
    
    
    let ccu;
    if(CCU_Version == 3){ccu = ccu3;}
    else if(CCU_Version == 4){ccu = Raspi;}
    else if(CCU_Version == 5){ccu = pivccu2;}
    else if(CCU_Version == 6){ccu = pivccu3;}
    else if(CCU_Version == 7){ccu = debimatic;}
    else if(CCU_Version == 51){ccu = testing_pivccu2;}
    else if(CCU_Version == 61){ccu = testing_pivccu3;}
    else if(CCU_Version == 71){ccu = testing_debimatic;}
    else {ccu = ccu2;}
    let url = ccu;

    request({url : url},

        function (error, response, body) {
            const Version_Internet = getState(id_Version_Internet).val;
            const Version_installiert = (getState(id_Version_installiert).val).trim();
            //log('[DEBUG] ' +'Typ body: ' +typeof body);
            
            const Version = body.split("'");
            //log('[DEBUG] ' +'Typ Version: ' +typeof Version);
            //Fehler finden
            if(debugging){
                log('[DEBUG] ' +'Typ body: ' +typeof body);
                log('[DEBUG] ' +'Typ Version: ' +typeof Version);
                log('[DEBUG] ' +'Typ Version1: ' +typeof Version[1]);
                log('[DEBUG] ' +'Typ Version2: ' +typeof Version[2]);
                log('[DEBUG] ' +'Typ Version3: ' +typeof Version[3]);
            }
            
            if(error){
                log('error: ' + error);
            } else {
                if(debugging){
                    log('[DEBUG] ' +'Version installiert: '+Version_installiert);
                    log('[DEBUG] ' +'Version Internet: '+Version_Internet);
                    log('[DEBUG] ' +'Version aus URL: '+Version[1]);
                    log('[DEBUG] ' +'Name aus URL für Version: '+Version[3]);
                }
                //if(typeof Version[1] == "string") {
                    if(Version_Internet === ''){
                        if(logging){
                            log('ausgewähltes Objekt leer. Firmware wird erstmalig gesetzt. Firmware: '+Version[1] +' Zentrale: ' +Version[3]);
                        }
                        setState(id_Version_Internet,Version[1]);
                    }
                
                    if(Version_installiert == Version[1]){
                        if(logging){
                            log('Installierte Firmware '+Version_installiert  +' der CCU ('+Version[3]  +') ist aktuell.');
                        }
                    }
                    else{
                        if(logging){
                            log('Installierte Firmware '+Version_installiert  +' der CCU ('+Version[3]  +') ist nicht aktuell. Aktuell verfügbare Version: '+Version[1]);
                        }
                    
                        if(Version_Internet == Version[1]){
                            if(debugging){
                                log('[DEBUG] ' +'Version Internet hat sich nicht verändert');
                            }
                        } else {
                            if(debugging){
                                log('[DEBUG] ' +'Installierte Firmware der CCU ist nicht aktuell.');
                            }
                            if(isNAN(Version[1].substr(0,1))){
                                if(logging){
                                    log('Wahrscheinlich konnte die Version nicht ermittelt werden');    
                                }
                            }
                            else{
                                setState(id_Version_Internet,Version[1]);
                            
                                _message_tmp = 'Installierte Firmware der CCU ('+Version[3]  +') ist nicht aktuell. Installiert: ' +Version_installiert +' --- Verfügbare Version: '+Version[1];
                        
                                //Push verschicken
                                if(sendpush){
                                    _prio = prio_Firmware;
                                    _titel = 'CCU-Firmware';
                                    _message = _message_tmp;
                                    send_pushover_V4(_device, _message, _titel, _prio);
                                }
                                if(sendtelegram){
                                    _message = _message_tmp;
                                    send_telegram(_message, user_telegram);
                                }
                                if(sendmail){
                                    _message = _message_tmp;
                                    send_mail(_message);
                                }
                            }
                        }         
                    }
                //}
                //else{
                //    if(logging){
                //        log('Version im Internet kann zur Zeit nicht abgefragt werden.');
                //    }
                //}
        
                if(debugging_response){
                    log('body: ' + body);
                    log('Länge ' + Version.length + ' --- Version: ' + Version[1]);
                    log('response: ' + JSON.stringify(response));
                }
            }
        }
    );
}

if(observation){
    //Nachts einmalig ausführen 00:30 Schaltzeiten berechnen
    schedule("54 05 * * *", func_Version);
}

if(onetime){
    //beim Starten
    func_Version();
}
