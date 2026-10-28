'use strict';
// Language: the island in Dutch (nl, default) or English (en). Settings → Algemeen → Taal / Language.
// Every text drawn on the canvas goes through text(), and every DOM page is watched, so all screens
// are translated in one place. Unknown texts (your own notes, Claude's messages, file names) stay as they are.
(function i18n() {
  const lang = () => (window.__twocodePrefs?.().lang === 'en' ? 'en' : 'nl');
  window.__twocodeLang = lang;

  const EXACT = {
    // states and labels
    'Bezig': 'Working', 'Versturen': 'Sending', 'Vraag': 'Question', 'Fout': 'Error', 'Gestopt': 'Stopped', 'Niet beschikbaar': 'Unavailable',
    'Klaar': 'Done', 'Verbinden': 'Connecting', 'Niet verbonden': 'Not connected', 'Inloggen': 'Log in', 'Rustig': 'Idle', 'rustig': 'idle',
    'Wacht op jou': 'Waiting for you', '● Wacht op jou': '● Waiting for you', '✓ Klaar': '✓ Done', '✕ Gestopt met een fout': '✕ Stopped with an error',
    'Wacht op Claude Code': 'Waiting for Claude Code', 'Claude is bezig': 'Claude is working', 'Claude bezig': 'Claude working',
    'Wil toestemming': 'Needs permission', 'Plan klaar': 'Plan ready', 'Heeft een vraag voor jou': 'Has a question for you',
    'Claude heeft een vraag voor je': 'Claude has a question for you', 'Claude Code heeft je nodig.': 'Claude Code needs you.',
    'Claude heeft je nodig in de terminal.': 'Claude needs you in the terminal.', 'Toegestaan, gaat verder': 'Allowed, continuing',
    'Geweigerd': 'Denied', 'Gezien': 'Seen', 'Niet actief': 'Not active', 'Niet gekoppeld': 'Not connected', 'Nog niet gekoppeld': 'Not connected yet',
    'Je antwoord is verstuurd': 'Your answer was sent', 'Claude is overbelast': 'Claude is overloaded', 'niet ingelogd': 'not logged in',
    'antwoord te lang': 'answer too long', 'Voert een opdracht uit': 'Running a command', 'Zoekt in de code': 'Searching the code',
    'Zoekt op internet': 'Searching the web', 'Start een helper': 'Starting a helper', 'Claude vraagt iets': 'Claude asks something',
    'Plan klaar: goedkeuren?': 'Plan ready: approve?', 'Er ging iets mis': 'Something went wrong', 'Fout: limiet bereikt': 'Error: limit reached',
    // permission
    'Toestaan': 'Allow', 'Weigeren': 'Deny', 'Bekijk': 'View', 'Mag ik dit doen?': 'May I do this?',
    // header / home / widgets
    'Apps': 'Apps', 'Widgets': 'Widgets', 'Lade': 'Tray', 'Klembord': 'Clipboard', 'Notitie': 'Note', 'Instellingen': 'Settings',
    'Klok': 'Clock', 'Muziek': 'Music', 'Apparaten': 'Devices', '🔇 Geluid uit': '🔇 Sound off', 'Leeg': 'Empty', 'Opschrijven': 'Write it down', 'Laatste kopieën': 'Last copies', 'Kleuren, geluid': 'Colours, sound',
    'Kleuren, geluid en meer': 'Colours, sound and more', 'Je laatste kopieën': 'Your last copies', 'Snel iets opschrijven': 'Jot something down',
    'Niks aan het spelen': 'Nothing playing', 'opent TwoCode overal': 'opens TwoCode anywhere', 'TIP': 'TIP',
    'Alles wat TwoCode voor je kan doen · Ctrl+Alt+1–6 = sneltoets': 'Everything TwoCode can do · Ctrl+Alt+1–6 = shortcut',
    'Sleep om te verplaatsen  ·  + voor nieuwe widgets': 'Drag to move  ·  + for new widgets',
    'Kies een app en een maat, of pak een kant-en-klare indeling': 'Pick an app and a size, or a ready-made layout',
    'Standaard': 'Default', '8 klein': '8 small', '2 groot': '2 big', '4 breed': '4 wide', 'Klein': 'Small', 'Breed': 'Wide', 'Groot': 'Big',
    'Staat er al': 'Already there', 'Geen plek': 'No room', 'Toevoegen': 'Add', 'Maak klein': 'Make small', 'Maak breed': 'Make wide', 'Maak groot': 'Make big',
    'Haal eerst iets weg of maak iets kleiner': 'Remove something or make it smaller first', 'Geen plek om groter te maken': 'No room to make it bigger',
    'Focus loopt': 'Focus running', 'Blijf gefocust': 'Stay focused', 'Blijf gefocust, Robo let op': 'Stay focused, Robo is watching',
    'Klaar om te starten': 'Ready to start', 'Tik om iets op te schrijven': 'Tap to write something down', 'Kopieer iets, dan staat het hier': 'Copy something and it shows up here',
    'Snelkoppelingen': 'Shortcuts', 'Jouw favoriete apps': 'Your favourite apps', 'Aanpassen': 'Edit', '+ Lege plek': '+ Empty spot',
    'Tip: Ctrl + Alt + 1–6 opent apps ook met het toetsenbord': 'Tip: Ctrl + Alt + 1–6 also opens apps from the keyboard',
    'Max 4 · haal er eerst een uit': 'Max 4 · remove one first', 'Kies tot 4 apps · ze staan ook op je homescherm': 'Pick up to 4 apps · they are on your home screen too',
    // music
    'Er speelt nu niks': 'Nothing is playing', 'Start muziek in Spotify, of druk op afspelen.': 'Start music in Spotify, or press play.',
    'Spotify koppelen': 'Connect Spotify', 'Dan zie en bedien je je muziek hier.': 'Then you see and control your music here.', 'Koppel Spotify': 'Connect Spotify',
    'Spotify blokkeert deze app (403)': 'Spotify blocked this app (403)', 'Controleer Spotify Development Mode-toegang in het dashboard.': 'Check Spotify Development Mode access in the dashboard.',
    'Spotify gaf 403. In Development Mode heeft de app-eigenaar Premium nodig en moet je account in Users and Access staan. Afspelen vereist ook Premium.': 'Spotify returned 403. Development Mode requires Premium for the app owner and your account to be allowlisted. Playback also requires Premium.',
    'Spotify-bediening vereist een Premium-account.': 'Spotify playback controls require a Premium account.',
    '⏭  Volgend nummer': '⏭  Next song', '⏮  Vorig nummer': '⏮  Previous song',
    // tray, clipboard, note, focus
    'Laat los, ik vang hem!': "Let go, I'll catch it!", '🧺 Laat los, ik vang hem!': "🧺 Let go, I'll catch it!", 'Het bestand komt in je lade': 'The file goes into your tray',
    'Sleep een bestand eruit, of klik om het te openen': 'Drag a file out, or click to open it', 'Sleep bestanden op de island om ze even te bewaren': 'Drop files on the island to keep them for a bit',
    'Sleep hier een bestand heen om het toe te voegen': 'Drop a file here to add it', 'Sleep een bestand op de island om het even te bewaren': 'Drop a file on the island to keep it for a bit',
    'Uit de lade halen': 'Take out of the tray', 'Sleep een kaartje eruit, of klik om het te openen': 'Drag a card out, or click to open it', 'Bewaar bestanden even, en sleep ze er later weer uit': 'Keep files for a bit, and drag them out later',
    'Even checken voor je videogesprek · de camera stopt als je weggaat': 'A quick check before your video call · the camera stops when you leave',
    'Geen camera gevonden, of Windows geeft geen toegang (Instellingen → Privacy → Camera).': 'No camera found, or Windows gives no access (Settings → Privacy → Camera).',
    'Klik op een kaart om hem weer te kopiëren': 'Click a card to copy it again',
    'Sleep hierheen': 'Drop here', 'Wis geschiedenis': 'Clear history',
    'Je lade is leeg': 'Your tray is empty', 'Sleep een bestand op TwoCode om het even te bewaren': 'Drop a file on TwoCode to keep it for a bit',
    'Je laatst gekopieerde tekst · klik om opnieuw te kopiëren': 'Your last copied text · click to copy again', 'Wissen': 'Clear', 'Gekopieerd ✓': 'Copied ✓',
    'Nog niks gekopieerd': 'Nothing copied yet', 'Kopieer iets (Ctrl + C), dan verschijnt het hier.': 'Copy something (Ctrl + C) and it shows up here.',
    'Even iets opschrijven · wordt vanzelf bewaard': 'Jot something down · saved automatically', 'Typ hier…': 'Type here…',
    'Je bent aan het focussen. TwoCode houdt de tijd bij.': 'You are focusing. TwoCode keeps the time.', 'Kies hoe lang je wil focussen': 'Choose how long you want to focus',
    'Start focus': 'Start focus', 'Stoppen': 'Stop', 'Uren': 'Hours', 'Minuten': 'Minutes', 'Seconden': 'Seconds', 'Uren meer': 'More hours', 'Uren minder': 'Fewer hours',
    'Minuten meer': 'More minutes', 'Minuten minder': 'Fewer minutes', 'Seconden meer': 'More seconds', 'Seconden minder': 'Fewer seconds', '1 uur': '1 hour',
    'Focus klaar!': 'Focus done!', 'Muziek en Claude blijven gewoon zichtbaar in het kleine eiland.': 'Music and Claude stay visible in the small island.',
    // Claude Code page
    'Volgt al je Claude Code-sessies': 'Follows all your Claude Code sessions', 'Verbind jouw gesprek': 'Connect your conversation', 'Kies jouw venster': 'Choose your window',
    'Jouw antwoord…': 'Your answer…', 'Antwoord op de vraag': 'Answer the question', 'Typ iets voor Claude…': 'Type something for Claude…', 'Of typ je eigen antwoord…': 'Or type your own answer…',
    'Bewerkt': 'Edited', 'Voert uit': 'Runs', 'Helper bezig': 'Helper working', 'Gelezen': 'Read', 'Uitgevoerd': 'Ran', 'Gezocht': 'Searched', 'Online gezocht': 'Searched online',
    'Helper klaar': 'Helper done', 'Samenvatting': 'Summary', 'Geen bestanden aangeraakt': 'No files touched', 'Nog geen gesprek': 'No conversation yet',
    'Typ iets in Claude Code. Hier zie je het gesprek live meelopen.': 'Type something in Claude Code. You will see the conversation here, live.',
    'Claude werkt. Je krijgt een seintje als hij klaar is.': "Claude is working. You'll get a ping when it's done.", 'Verder praten? Typ in je terminal.': 'Want to keep going? Type in your terminal.',
    'Kijk in de terminal wat er misging.': 'Check the terminal to see what went wrong.', 'Wat moet er anders?': 'What should change?', 'Goedkeuren': 'Approve', 'Stuur': 'Send', 'Speelt nu': 'Playing now', 'Wacht op je AI': 'Waiting for your AI', '● Vraag': '● Question', 'Log eerst in': 'Sign in first', 'Volgt dit gesprek': 'Following this chat', 'Klaar · je antwoord staat klaar': 'Done · your answer is ready', 'Het antwoord komt eraan…': 'The answer is on its way…', 'Robo meldt het als je AI klaar is of iets vraagt.': 'Robo tells you when your AI is done or asks something.', 'Koppel je AI in TwoCode → Verbindingen.': 'Connect your AI in TwoCode → Connections.', 'Geen actieve sessie': 'No active session', 'Je antwoord staat klaar in het gesprek.': 'Your answer is ready in the chat.', 'Open Spotify op een ander apparaat, dan zie je het hier.': 'Open Spotify on another device to see it here.', 'Deze pc': 'This PC', 'Kon je apparaten niet ophalen.': "Couldn't load your devices.", 'Dat lukte niet.': "That didn't work.", '5-uurslimiet': '5-hour limit', 'AI is bezig': 'AI is working', 'Bericht aan Claude Code': 'Message to Claude Code', 'Speel af op': 'Play on', 'Open gesprek': 'Open chat', 'Open Verbindingen': 'Open Connections', 'Koppelen in TwoCode': 'Connect in TwoCode', 'Codex staat nog niet op deze pc': 'Codex is not on this PC yet', 'Eén schakelaar in TwoCode → Verbindingen. Daarna doet TwoCode de rest.': 'One switch in TwoCode → Connections. TwoCode does the rest.', 'Nog geen geschikt venster gevonden. Houd een websitegesprek in een eigen venster.': 'No suitable window found yet. Keep a website chat open in its own window.', 'Naar terminal': 'To terminal',
    'Breng het Claude Code-venster naar voren': 'Bring the Claude Code window to the front', 'Welk model gebruikt Claude?': 'Which model does Claude use?',
    'Kies welk Claude-model Claude Code gebruikt': 'Choose which Claude model Claude Code uses', 'Wat Claude Code zelf kiest': 'What Claude Code picks itself',
    'Het slimst, voor moeilijke klussen': 'The smartest, for hard jobs', 'Snel en slim, voor de meeste dingen': 'Fast and smart, for most things',
    'Supersnel, voor kleine dingen': 'Super fast, for small things', 'Opus plant, Sonnet bouwt': 'Opus plans, Sonnet builds', 'Opus plan': 'Opus plan',
    'Voor nieuwe sessies · in een lopend gesprek:': 'For new sessions · in a running conversation:', 'Koppel Claude Code': 'Connect Claude Code',
    'Daarna Claude Code één keer opnieuw starten.': 'Then restart Claude Code once.', 'Gekoppeld. Even wachten tot TwoCode klaar is met starten.': 'Connected. Wait a moment until TwoCode has started.',
    'Houd het gesprek open in een eigen venster terwijl je verder werkt.': 'Keep the conversation open in its own window while you keep working.',
    '(kies er meer)': '(pick several)', 'In je lade': 'In your tray', 'Bezig…': 'Working…', 'Gewijzigd': 'Changed', 'TwoCode volgt het vanzelf': 'TwoCode follows it by itself', 'Bezig ·': 'Working ·', 'Wat wil je vinden in dit project?': 'What do you want to find in this project?',
    'Gebruik de browser of desktopapp waarin je bent ingelogd. Log in op de originele site of app. Je wachtwoord blijft bij .': 'Use the browser or desktop app where you are logged in. Log in on the original site or app. Your password stays there.',
    // demo scenes (test mode / videos)
    'Maak de knop op de homepage blauw': 'Make the button on the homepage blue', 'Maak de knop mooier': 'Make the button look nicer',
    'Ik kan de knop blauw of groen maken. Welke kleur wil je?': 'I can make the button blue or green. Which colour do you want?',
    'Klaar! De knop is nu blauw en licht op als je eroverheen gaat. Alle tests slagen.': 'Done! The button is blue now and lights up when you hover it. All tests pass.',
    'Zet de website online': 'Put the website online', 'Fix de btw-berekening': 'Fix the VAT calculation',
    'Klaar! De btw is nu 21% en wordt netjes afgerond. Alle 48 tests slagen.': 'Done! VAT is now 21% and rounds correctly. All 48 tests pass.',
    // messages in the small island
    'Au! Te veel tikken… even bijkomen 😵': 'Ouch! Too many taps… need a sec 😵', 'Ik heb honger… maak een taak af 🍪': "I'm hungry… finish a task 🍪",
    'Doe het even rustig aan.': 'Take it easy for a bit.', 'Hoi!': 'Hi!',
    // settings
    'Maak TwoCode helemaal van jou': 'Make TwoCode completely yours', 'Algemeen': 'General', 'Karakter': 'Character', 'Aan': 'On', 'Uit': 'Off', 'Opslaan': 'Save', 'Herstel': 'Reset',
    'Taal': 'Language', 'Taal · Language': 'Language · Taal', 'De taal van de island': 'The language of the island',
    'Testen': 'Testing', 'Testmodus': 'Test mode', 'Knoppen om alles te bekijken zonder echte Claude of muziek': 'Buttons to try everything without real Claude or music',
    '👋 Opstarten': '👋 Start up', '😴 Afsluiten': '😴 Shut down', '🟠 Claude bezig': '🟠 Claude working', '❓ Claude vraagt': '❓ Claude asks', '🟢 Claude klaar': '🟢 Claude done',
    '🔴 Claude fout': '🔴 Claude error', '🎵 Nep-muziek': '🎵 Fake music', '⏱️ Focus 1 min': '⏱️ Focus 1 min', '🧹 Alles stoppen': '🧹 Stop everything',
    'Animaties': 'Animations', 'Snelheid': 'Speed', 'Hoe snel de island opent, sluit en reageert': 'How fast the island opens, closes and reacts', 'Snel': 'Fast', 'Normaal': 'Normal',
    'Starten met Windows': 'Start with Windows', 'TwoCode start vanzelf als je je pc aanzet': 'TwoCode starts by itself when you turn on your PC',
    'Opnieuw starten': 'Restart', 'Sluit TwoCode en start hem meteen opnieuw': 'Closes TwoCode and starts it again right away', 'Herstart': 'Restart',
    'Afsluiten': 'Quit', 'TwoCode afsluiten?': 'Quit TwoCode?', 'Ja, afsluiten': 'Yes, quit', 'Nee': 'No', 'Sluit TwoCode helemaal af. Kan ook via Robo rechtsonder bij de klok.': 'Quits TwoCode completely. Also possible via Robo next to the clock.',
    'App-animaties': 'App animations', 'Robo doet een kunstje als je een app opent': 'Robo does a little trick when you open an app', 'Confetti': 'Confetti', 'Bij lange taken, focus klaar en nieuwe outfits': 'For long tasks, finished focus and new outfits', 'Focus & meldingen': 'Focus & notifications',
    'Stoplicht-geluiden': 'Traffic-light sounds', 'Ding bij klaar, pling bij een vraag, laag bij fout': 'Ding when done, pling for a question, low for an error',
    'Windows-meldingen': 'Windows notifications', 'Melding bij klaar, vraag, focus en limiet': 'Notification for done, question, focus and limit',
    'Waarschuw bij limiet': 'Warn at limit', 'Melding als je zoveel van je 5-uurslimiet gebruikt hebt': 'Notify when you used this much of your 5-hour limit', 'Nooit': 'Never',
    'Geluidspakket': 'Sound pack', 'Hoe de stoplicht-geluiden klinken (klik om te horen)': 'How the traffic-light sounds sound (click to hear)', 'Klassiek': 'Classic',
    'Zacht': 'Soft', 'Belletjes': 'Bells', 'Kleurenblind': 'Colour-blind', 'Island': 'Island', 'Weer': 'Weather', 'Typ je stad om het weer op het homescherm te zien': 'Type your city to see the weather on the home screen',
    'Bijv. Amsterdam': 'E.g. Amsterdam', 'Agenda': 'Calendar', 'Gekoppeld: je volgende afspraak staat op het homescherm': 'Connected: your next event is on the home screen',
    'Google Agenda: Instellingen → je agenda → "Geheim adres in iCal-indeling". Plak die link hier.': 'Google Calendar: Settings → your calendar → "Secret address in iCal format". Paste that link here.',
    'Volumebalk': 'Volume bar', 'Laat het volume zien in de island als je het verandert': 'Show the volume in the island when you change it',
    'Batterij-waarschuwing': 'Battery warning', 'Laptop en Bluetooth (koptelefoon, muis) bijna leeg': 'Laptop and Bluetooth (headphones, mouse) almost empty',
    'Alles terugzetten': 'Reset everything', 'Zet al deze keuzes terug naar standaard': 'Set all these choices back to default',
    'Naam': 'Name', 'Hoe heet hij?': "What's his name?", 'Hij zegt het als hij hoi zegt': 'He says it when he says hi', 'Uiterlijk': 'Look',
    'Kleur van de ogen': 'Eye colour', 'Als er niks aan de hand is': 'When nothing is going on', 'Kleur van het lijfje': 'Body colour', 'Kies wat bij hem past': 'Pick what suits him',
    'Outfit': 'Outfit', 'Beste': 'Best', 'Geen': 'None', 'Feesthoedje': 'Party hat', 'Zonnebril': 'Sunglasses', 'Kroon': 'Crown', 'Seizoensoutfits': 'Seasonal outfits',
    'Kerstmuts, heksenhoed, oranje kroon op Koningsdag': "Santa hat, witch hat, orange crown on King's Day", 'Stoplicht-ogen': 'Traffic-light eyes',
    'Kies zelf de kleur voor elke stand. Klik het blokje voor een test.': 'Pick the colour for each state. Click the block for a test.',
    'Bezig of een vraag': 'Working or a question', 'Aangepast': 'Custom', 'Gezichtjes': 'Faces', 'Emoties bekijken': 'See emotions', 'Klik er een aan om het te zien': 'Click one to see it',
    'Blij, verdrietig, nieuwsgierig, gefocust': 'Happy, sad, curious, focused', '😊 Blij': '😊 Happy', '😍 Verliefd': '😍 In love', '😮 Verrast': '😮 Surprised',
    '🤔 Nieuwsgierig': '🤔 Curious', '🧐 Gefocust': '🧐 Focused', '😉 Knipoog': '😉 Wink', '😢 Verdrietig': '😢 Sad', '😵 Duizelig': '😵 Dizzy', '😴 Slaperig': '😴 Sleepy',
    'Gedrag · klik een blokje voor een voorbeeld': 'Behaviour · click a block for an example', 'Knipperen': 'Blinking', 'Hij knippert af en toe met zijn ogen': 'He blinks now and then',
    'Dansen op muziek': 'Dancing to music', 'Meebewegen als Spotify speelt': 'Moves along when Spotify plays', 'Slaapeffect': 'Sleep effect',
    'Hij valt in slaap als er even niks gebeurt': 'He falls asleep when nothing happens for a while', 'In slaap vallen na': 'Fall asleep after',
    'Als er niks gebeurt (Slaapeffect moet aan staan)': 'When nothing happens (Sleep effect must be on)', 'Opstartanimatie': 'Startup animation',
    'Zwaaien en "hoi" zeggen bij het opstarten': 'Wave and say "hi" at startup', 'Honger': 'Hunger', 'Hij krijgt honger als je lang geen taak afmaakt': "He gets hungry when you don't finish a task for a long time",
    'Nog niet verdiend': 'Not earned yet', 'Alle outfits verdiend': 'All outfits earned', 'Eerste taak': 'First task', 'Tien taken': 'Ten tasks', 'Vijftig taken': 'Fifty tasks',
    'Nachtuil': 'Night owl', 'Vroege vogel': 'Early bird', 'Lange adem': 'Long haul', 'Lekker bezig': 'On a roll', 'Focusmeester': 'Focus master', 'Behulpzaam': 'Helpful',
    'Verzamelaar': 'Collector', 'Mode-icoon': 'Fashion icon', 'DJ': 'DJ', 'Claude Code maakt een taak af': 'Claude Code finishes a task', 'Een taak klaar na middernacht': 'A task done after midnight',
    'Een taak klaar voor 7 uur': 'A task done before 7 am', 'Een taak van meer dan 15 minuten': 'A task of more than 15 minutes', 'De spiegel gebruikt': 'Used the mirror',
    '10 taken klaar': '10 tasks done', '50 taken klaar': '50 tasks done', '5 focusblokken afgemaakt': '5 focus blocks finished', '5 bestanden in de lade': '5 files in the tray',
    '10 keer Spotify bediend vanuit de island': 'Controlled Spotify 10 times from the island', '10 keer antwoorden vanuit de island': 'Answered 10 times from the island',
    'wolk': 'cloud', 'munt': 'mint', 'lucht': 'sky', 'roos': 'rose', 'nacht': 'night', 'blauw': 'blue', 'geel': 'yellow', 'goud': 'gold', 'paars': 'purple', 'roze': 'pink',
    'wit': 'white', 'mint': 'mint', 'klassiek': 'classic'
  };
  const PATTERNS = [
    [/^Mag ik: (.+)\?$/, 'Allow: $1?'], [/^(\d+) bestanden…$/, '$1 files…'], [/^Limiet (\d+)%$/, 'Limit $1%'], [/^5-uurslimiet$/, '5-hour limit'],
    [/^Leest (een bestand)$/, 'Reading a file'], [/^Leest (.+)$/, 'Reading $1'], [/^Bewerkt (een bestand)$/, 'Editing a file'], [/^Bewerkt (.+)$/, 'Editing $1'], [/^Gebruikt (.+)$/, 'Using $1'],
    [/^Nog (\d.*)$/, '$1 left'], [/^(\d+) min$/, '$1 min'], [/^(\d+) bestand$/, '$1 file'], [/^(\d+) bestanden$/, '$1 files'],
    [/^(\d+) bestand bewerkt$/, '$1 file edited'], [/^(\d+) bestanden bewerkt$/, '$1 files edited'], [/^(\d+) bestand gelezen$/, '$1 file read'], [/^(\d+) bestanden gelezen$/, '$1 files read'],
    [/^(\d+) keer gezocht$/, 'searched $1 times'], [/^(\d+) opdracht$/, '$1 command'], [/^(\d+) opdrachten$/, '$1 commands'], [/^(\d+) sessies$/, '$1 sessions'],
    [/^(\d+)\/(\d+) gekozen$/, '$1/$2 picked'], [/^Vol \((\d+)\/(\d+)\) · klik er een uit om te wisselen$/, 'Full ($1/$2) · click one off to swap'],
    [/^(\d+) taken klaar · (\d+)\/(\d+) prestaties$/, '$1 tasks done · $2/$3 achievements'], [/^(\d+) taken klaar\. Verdien meer door taken af te ronden\.$/, '$1 tasks done. Earn more by finishing tasks.'],
    [/^Prestaties · (\d+)\/(\d+)$/, 'Achievements · $1/$2'], [/^(.+) is (\d+)% vol\. Elke taak geeft eten 🍪$/, '$1 is $2% full. Every task gives food 🍪'],
    [/^Klaar om (.+)$/, 'Done at $1'], [/^van (.+)$/, 'of $1'], [/^Nu: (.+)$/, 'Now: $1'], [/^Nu in gebruik: (.+)$/, 'In use now: $1'],
    [/^Haal (.+) uit de lade$/, 'Remove $1 from the tray'], [/^(\d+) taken klaar: je hebt een (.+) verdiend\.$/, '$1 tasks done: you earned a $2.'],
    [/^(.+) gefocust\. Neem even pauze\.$/, '$1 focused. Take a short break.'], [/^Je hebt (\d+)% van je Claude-limiet gebruikt$/, "You've used $1% of your Claude limit"],
    [/^Om (.+) is hij weer vol\.$/, "It's full again at $1."], [/^Speelt op (.+)$/, 'Playing on $1'], [/^Wisselen naar (.+)…$/, 'Switching to $1…'], [/^Stel je vraag in (.+)\. Robo kijkt mee\.$/, 'Ask your question in $1. Robo is watching.'], [/^(.+) vraagt iets$/, '$1 asks something'], [/^(.+) schrijft…$/, '$1 is writing…'], [/^(\d+) bezig$/, '$1 working'], [/^(\d+) wachten op jou$/, '$1 waiting for you'], [/^(\d+) klaar$/, '$1 done'], [/^\+ nog (\d+)$/, '+ $1 more'], [/^(🪫|🔋) Nog (\d+)% batterij\. Sluit je lader aan!$/, '$1 $2% battery left. Plug in your charger!'],
    [/^Batterij bijna leeg: (\d+)%$/, 'Battery almost empty: $1%'], [/^Sluit je lader aan\.$/, 'Plug in your charger.'],
    [/^(.+) is bijna leeg$/, '$1 is almost empty'], [/^Nog (\d+)% batterij\.$/, '$1% battery left.'],
    [/^🎧 (.+): nog (\d+)%$/, '🎧 $1: $2% left'], [/^📅 Over (\d+) min: (.+)$/, '📅 In $1 min: $2'], [/^(Bezig of een vraag|Klaar|Fout): (#\w+)$/, (m, a, b) => `${tr(a)}: ${b}`]
  ];
  function translate(t) {
    if (Object.prototype.hasOwnProperty.call(EXACT, t)) return EXACT[t];
    for (const [re, rep] of PATTERNS) if (re.test(t)) return t.replace(re, rep);
    // made of parts, like "Claude · Bezig" or "ChatGPT: Niet verbonden. Claude Code: Klaar"
    if (t.length > 120) return null; // long texts (Claude's messages, your notes) are never split up
    for (const sep of [' · ', '. ', ': ']) {
      if (!t.includes(sep)) continue;
      const parts = t.split(sep), out = parts.map(p => translate(p) ?? (sep === '. ' ? translate(p + '.')?.replace(/\.$/, '') : null));
      if (out.some((o, i) => o != null && o !== parts[i])) return out.map((o, i) => o ?? parts[i]).join(sep);
    }
    return null;
  }
  function tr(s) {
    if (lang() !== 'en' || typeof s !== 'string') return s;
    const t = s.trim(); if (!t) return s;
    const out = translate(t);
    return out == null ? s : s.replace(t, out);
  }
  window.__twocodeTr = tr;

  // ---- canvas: everything drawn with text() ----
  const baseText = text;
  text = function (value, ...rest) { return baseText(typeof value === 'string' ? tr(value) : value, ...rest); };

  // ---- DOM pages: translate text and labels, remember the Dutch to switch back ----
  const SKIP = 'script,style,textarea,input,.tl-clip,.tl-list';
  const original = new WeakMap(), ATTRS = ['placeholder', 'title', 'aria-label'];
  let applying = false;
  function fixNode(node) {
    if (node.nodeType === 3) {
      if (!node.parentElement || node.parentElement.closest(SKIP)) return;
      const value = node.nodeValue, known = original.get(node);
      const source = known && known.shown === value ? known.nl : value;
      const want = lang() === 'en' ? tr(source) : source;
      if (want !== value) { node.nodeValue = want; }
      if (want !== source) original.set(node, { nl: source, shown: want }); else original.delete(node);
      return;
    }
    if (node.nodeType !== 1 || node.closest?.('script,style')) return;
    for (const a of ATTRS) {
      if (!node.hasAttribute(a)) continue;
      const key = 'data-nl-' + a, value = node.getAttribute(a);
      const source = node.hasAttribute(key) && node.getAttribute(key + '-shown') === value ? node.getAttribute(key) : value;
      const want = lang() === 'en' ? tr(source) : source;
      if (want !== value) node.setAttribute(a, want);
      if (want !== source) { node.setAttribute(key, source); node.setAttribute(key + '-shown', want); } else { node.removeAttribute(key); node.removeAttribute(key + '-shown'); }
    }
  }
  function fixTree(root) {
    fixNode(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let n;
    while ((n = w.nextNode())) fixNode(n);
  }
  const observer = new MutationObserver(list => {
    if (applying) return; applying = true;
    try { for (const m of list) { if (m.type === 'childList') m.addedNodes.forEach(fixTree); else fixNode(m.target); } }
    finally { applying = false; observer.takeRecords(); }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  // switching language: redo everything that is on screen
  let shownLang = null;
  setInterval(() => { const now = lang(); if (now !== shownLang) { shownLang = now; applying = true; try { fixTree(document.body); } finally { applying = false; observer.takeRecords(); } } }, 250);

  // ---- Windows notifications and dates ----
  if (window.Notification) {
    const N = window.Notification;
    window.Notification = class extends N { constructor(title, options = {}) { super(tr(title), { icon: './assets/icon-256.png', ...options, body: options.body && tr(options.body) }); } }; // with the TwoCode icon
  }
  for (const fn of ['toLocaleDateString', 'toLocaleTimeString', 'toLocaleString']) {
    const base = Date.prototype[fn];
    Date.prototype[fn] = function (locale, options) { return base.call(this, lang() === 'en' && /^nl/i.test(String(locale || '')) ? 'en-GB' : locale, options); };
  }
})();
