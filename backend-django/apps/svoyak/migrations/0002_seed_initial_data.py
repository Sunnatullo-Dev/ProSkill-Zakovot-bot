"""Data migration — Svoyak boshlang'ich kategoriyalar va savollarni qo'shadi.

Bu migration `migrate` ish vaqtida avtomatik ishga tushadi va idempotent
(get_or_create asosida — mavjud bo'lsa skip qiladi). Production'da har
deploy'dan keyin ishlaydi (Django allaqachon bajarilgan migration'larni
qaytarib chaqirmaydi, demak FAQAT BIR MARTA — keyingi seed'lar
seed_svoyak komandasi orqali yoki admin endpoint orqali bo'ladi).
"""
from django.db import migrations


def forward(apps, schema_editor):
    """Boshlang'ich ma'lumotlarni qo'shadi.

    Seed_svoyak management komandasini chaqirib bo'lmaydi (apps registry
    migration ichida hali to'la emas). Shu uchun ma'lumotlarni shu yerda
    inline qo'shamiz.
    """
    SvoyakCategory = apps.get_model("svoyak", "SvoyakCategory")
    SvoyakQuestion = apps.get_model("svoyak", "SvoyakQuestion")

    for cat_idx, cat_data in enumerate(CATEGORIES_DATA):
        cat, _ = SvoyakCategory.objects.get_or_create(
            name=cat_data["name"],
            defaults={
                "icon_emoji": cat_data["icon"],
                "order": cat_idx,
                "is_active": True,
                "language": "uz-latn",
            },
        )
        for value_tier, questions in cat_data["questions"].items():
            for text, correct, wrongs in questions:
                if SvoyakQuestion.objects.filter(category=cat, text=text).exists():
                    continue
                SvoyakQuestion.objects.create(
                    category=cat,
                    value_tier=value_tier,
                    text=text,
                    correct_answer=correct,
                    wrong_answers=list(wrongs),
                    question_type="abcd",
                    is_active=True,
                )


def backward(apps, schema_editor):
    """Rollback — seed ma'lumotlarini olib tashlaydi.

    Faqat bizning seed qilgan kategoriyalarimizni o'chiramiz (boshqa
    admin orqali qo'shilgan kategoriyalarni saqlaymiz).
    """
    SvoyakCategory = apps.get_model("svoyak", "SvoyakCategory")
    names = [c["name"] for c in CATEGORIES_DATA]
    SvoyakCategory.objects.filter(name__in=names).delete()


# ─── Boshlang'ich savollar ──────────────────────────────────────────────────
CATEGORIES_DATA = [
    {
        "name": "Tarix",
        "icon": "🏛️",
        "questions": {
            10: [
                ("O'zbekiston Mustaqillik kuni qaysi sana?", "1 sentyabr",
                 ["8 dekabr", "9 may", "21 mart"]),
                ("Amir Temur qaysi davlat asoschisi?", "Temuriylar",
                 ["Saljuqiylar", "Shayboniylar", "Sheyboniylar"]),
                ("II Jahon urushi necha yilda tugagan?", "1945",
                 ["1943", "1944", "1946"]),
            ],
            20: [
                ("Buyuk Britaniyaning birinchi ayol bosh vaziri kim?", "Margaret Tetcher",
                 ["Indira Gandi", "Angela Merkel", "Theresa May"]),
                ("Rim imperiyasining birinchi imperatori?", "Avgust",
                 ["Yuliy Sezar", "Neron", "Trayan"]),
                ("Sovet Ittifoqi qachon parchalandi?", "1991",
                 ["1989", "1990", "1993"]),
            ],
            30: [
                ("Bobur qaysi davlatga asos solgan?", "Buyuk Mug'ullar",
                 ["Eron", "Usmonli", "Safaviylar"]),
                ("Frantsuz inqilobi qachon boshlangan?", "1789",
                 ["1776", "1815", "1848"]),
                ("Berlin devori qachon qulagan?", "1989",
                 ["1985", "1991", "1987"]),
            ],
            40: [
                ("Aleksandr Makedonskiy qaysi imperiyani magʼlub etgan?", "Eron",
                 ["Rim", "Misr", "Hindiston"]),
                ("Konstantinopol qachon zabt etilgan?", "1453",
                 ["1492", "1500", "1389"]),
                ("Ulug'bek qaysi shaharda rasadxona qurgan?", "Samarqand",
                 ["Buxoro", "Hirot", "Marv"]),
            ],
            50: [
                ("Pyotr I qaysi shaharni asos solgan?", "Sankt-Peterburg",
                 ["Moskva", "Kiev", "Novgorod"]),
                ("Geroldot qaysi sohaning otasi?", "Tarix",
                 ["Falsafa", "Matematika", "Tibbiyot"]),
                ("Mug'ullar imperiyasi asoschisi?", "Chingizxon",
                 ["O'g'edey", "Botu", "Qubilay"]),
            ],
        },
    },
    {
        "name": "Geografiya",
        "icon": "🌍",
        "questions": {
            10: [
                ("O'zbekiston poytaxti?", "Toshkent",
                 ["Samarqand", "Buxoro", "Andijon"]),
                ("Eng katta okean?", "Tinch okean",
                 ["Atlantika", "Hind okeani", "Shimoliy muz okean"]),
                ("Quyosh qaysi tomondan chiqadi?", "Sharq",
                 ["G'arb", "Shimol", "Janub"]),
                ("Yer aylanma harakat davri?", "1 yil",
                 ["1 oy", "1 kun", "1 hafta"]),
            ],
            20: [
                ("Eng baland tog' cho'qqisi?", "Everest",
                 ["K2", "Lhotse", "Kangchenjunga"]),
                ("Amazon qaysi qit'ada?", "Janubiy Amerika",
                 ["Afrika", "Osiyo", "Avstraliya"]),
                ("Italiya poytaxti?", "Rim",
                 ["Milan", "Venetsiya", "Neapol"]),
                ("Saxara qaysi qit'ada?", "Afrika",
                 ["Osiyo", "Avstraliya", "Amerika"]),
            ],
            30: [
                ("Eng katta orol?", "Grenlandiya",
                 ["Madagaskar", "Borneo", "Yangi Gvineya"]),
                ("Eng katta yer osti suvi havzasi qaysi materikda?", "Avstraliya",
                 ["Afrika", "Osiyo", "Janubiy Amerika"]),
                ("Nil daryosi qaysi qit'ada?", "Afrika",
                 ["Osiyo", "Yevropa", "Amerika"]),
                ("Yaponiya poytaxti?", "Tokio",
                 ["Osaka", "Kioto", "Hirosima"]),
            ],
            40: [
                ("Antarktida qancha kontinent?", "1",
                 ["2", "3", "4"]),
                ("Madagaskar qaysi okean ichida?", "Hind okeani",
                 ["Tinch okean", "Atlantika", "Shimoliy"]),
                ("Eng katta cho'l?", "Antarktida",
                 ["Saxara", "Gobi", "Arabiston"]),
                ("Rossiya poytaxti?", "Moskva",
                 ["Sankt-Peterburg", "Kazan", "Novosibirsk"]),
            ],
            50: [
                ("Eng chuqur ko'l?", "Baykal",
                 ["Tanganika", "Viktoriya", "Kaspiy"]),
                ("Janubiy yarim shar yozi qachon?", "Dekabr-fevral",
                 ["Iyun-avgust", "Mart-may", "Sentyabr-noyabr"]),
                ("Eng kichik kontinent?", "Avstraliya",
                 ["Yevropa", "Antarktida", "Janubiy Amerika"]),
                ("Mariana botig'i qaysi okeanda?", "Tinch okean",
                 ["Atlantika", "Hind", "Shimoliy"]),
            ],
        },
    },
    {
        "name": "Matematika",
        "icon": "🔢",
        "questions": {
            10: [
                ("2 + 2 = ?", "4", ["3", "5", "6"]),
                ("Doiraning yuzi formulasi?", "πr²",
                 ["2πr", "πd", "r²"]),
                ("Eng kichik tub son?", "2", ["1", "3", "0"]),
            ],
            20: [
                ("√144 = ?", "12", ["10", "11", "14"]),
                ("Uchburchakda burchaklar yig'indisi?", "180°",
                 ["90°", "270°", "360°"]),
                ("10² = ?", "100", ["20", "200", "1000"]),
            ],
            30: [
                ("π ning taxminiy qiymati?", "3.14",
                 ["3.41", "2.71", "1.41"]),
                ("0! = ?", "1", ["0", "Aniqlanmagan", "Cheksiz"]),
                ("To'rtburchak ichki burchaklar yig'indisi?", "360°",
                 ["180°", "270°", "540°"]),
            ],
            40: [
                ("sin(90°) = ?", "1", ["0", "0.5", "-1"]),
                ("log(100) = ?", "2", ["1", "10", "100"]),
                ("e ning taxminiy qiymati?", "2.71",
                 ["3.14", "1.41", "1.61"]),
            ],
            50: [
                ("Pifagor teoremasi?", "a²+b²=c²",
                 ["a+b=c", "a²+b²=c", "a+b²=c²"]),
                ("Cheksiz qatorlar sohasi?", "Analiz",
                 ["Algebra", "Geometriya", "Statistika"]),
                ("Eyler formulasi: e^(iπ) + 1 = ?", "0",
                 ["1", "i", "-1"]),
            ],
        },
    },
    {
        "name": "Fan va texnika",
        "icon": "🔬",
        "questions": {
            10: [
                ("Suv formulasi?", "H2O", ["CO2", "O2", "H2"]),
                ("Quyosh tizimida nechta planeta bor?", "8", ["7", "9", "10"]),
                ("Yer atmosferasida eng ko'p gaz?", "Azot",
                 ["Kislorod", "Karbonad", "Argon"]),
            ],
            20: [
                ("Elektr toki birligi?", "Amper",
                 ["Volt", "Vat", "Om"]),
                ("Inson tanasidagi eng katta organ?", "Teri",
                 ["Jigar", "Yurak", "O'pka"]),
                ("DNK nima?", "Genetik kod",
                 ["Hujayra", "Oqsil", "Virus"]),
            ],
            30: [
                ("Yorug'lik tezligi?", "300 000 km/s",
                 ["150 000 km/s", "1 000 000 km/s", "30 km/s"]),
                ("Mendeleyev kim?", "Kimyogar",
                 ["Fizik", "Matematik", "Biolog"]),
                ("Insulin nimani boshqaradi?", "Qand",
                 ["Bosim", "Yog'", "Oqsil"]),
            ],
            40: [
                ("Atomning markazida?", "Yadro",
                 ["Elektron", "Proton", "Neytron"]),
                ("Tortilish kuchi qonuni kim?", "Nyuton",
                 ["Eynshteyn", "Maksvell", "Galiley"]),
                ("Atom raqami 1 bo'lgan element?", "Vodorod",
                 ["Geliy", "Litiy", "Uglerod"]),
            ],
            50: [
                ("Nisbiylik nazariyasi muallifi?", "Eynshteyn",
                 ["Nyuton", "Maksvell", "Plank"]),
                ("Hujayraning energetik stansiyasi?", "Mitoxondriya",
                 ["Yadro", "Ribosoma", "Membrana"]),
                ("Kvant fizika asoschisi?", "Plank",
                 ["Eynshteyn", "Bor", "Geyzenberg"]),
            ],
        },
    },
    {
        "name": "Sport",
        "icon": "⚽",
        "questions": {
            10: [
                ("Olimpiada nechta yilda bir bo'ladi?", "4",
                 ["2", "5", "10"]),
                ("Futbolda jamoa nechta?", "11",
                 ["9", "10", "12"]),
                ("Suzish formula 1 chempionati?", "FIA",
                 ["FIFA", "FINA", "FIBA"]),
            ],
            20: [
                ("Tennis turniri \"Wimbledon\" qaysi mamlakatda?", "Angliya",
                 ["AQSh", "Avstraliya", "Frantsiya"]),
                ("Boks raundi necha daqiqa?", "3",
                 ["2", "4", "5"]),
                ("Basketbolda jamoa nechta?", "5",
                 ["4", "6", "7"]),
            ],
            30: [
                ("Eng katta stadion qaysi mamlakatda?", "Shimoliy Koreya",
                 ["AQSh", "Braziliya", "Rossiya"]),
                ("Formula 1 birinchi chempioni?", "Farina",
                 ["Fanjio", "Senna", "Shumaxer"]),
                ("Voleybolda to'p tegishi soni?", "3",
                 ["2", "4", "5"]),
            ],
            40: [
                ("Marafonning uzunligi?", "42 km",
                 ["10 km", "21 km", "50 km"]),
                ("Olimpiada Yunonistonda boshlangan yili?", "1896",
                 ["1900", "1920", "1936"]),
                ("Krikket vatani?", "Angliya",
                 ["Hindiston", "Avstraliya", "Pokiston"]),
            ],
            50: [
                ("FIFA Jahon Kubogi necha yilda bir?", "4",
                 ["2", "3", "5"]),
                ("Tour de France qaysi mamlakat?", "Frantsiya",
                 ["Italiya", "Belgiya", "Ispaniya"]),
                ("Sumo qaysi mamlakat?", "Yaponiya",
                 ["Xitoy", "Koreya", "Mongoliya"]),
            ],
        },
    },
    {
        "name": "Kino va madaniyat",
        "icon": "🎬",
        "questions": {
            10: [
                ("Oskar mukofoti qaysi mamlakat?", "AQSh",
                 ["Frantsiya", "Italiya", "Angliya"]),
                ("Titanik filmi rejissyori?", "Jeyms Kameron",
                 ["Stiven Spilberg", "Kristofer Nolan", "Ridli Skott"]),
                ("Mickey Mouse muallifi?", "Uolt Disney",
                 ["Stiv Jobs", "Genri Ford", "Pixar"]),
            ],
            20: [
                ("Harry Potter muallifi?", "J.K. Rouling",
                 ["J.R.R. Tolkien", "Stiven King", "Agata Kristi"]),
                ("Mona Liza rassomi?", "Leonardo da Vinchi",
                 ["Mikelanjelo", "Rafael", "Botticelli"]),
                ("Yulduzli Urushlar (Star Wars) asoschisi?", "Jorj Lukas",
                 ["Stiven Spilberg", "JJ Abrams", "Jeyms Kameron"]),
            ],
            30: [
                ("Cannes festivali qaysi mamlakat?", "Frantsiya",
                 ["Italiya", "Ispaniya", "Yunoniston"]),
                ("Romeo va Juletta muallifi?", "Shekspir",
                 ["Pushkin", "Tolstoy", "Bayron"]),
                ("\"Pulp Fiction\" rejissyori?", "Tarantino",
                 ["Skorseze", "Koppola", "Spilberg"]),
            ],
            40: [
                ("Eng ko'p Oskar olgan film?", "Ben-Hur (1959)",
                 ["Titanik", "Avatar", "Forrest Gump"]),
                ("\"Krestnyy otets\" rejissyori?", "Koppola",
                 ["Skorseze", "Spilberg", "Lukas"]),
                ("Pikasso qaysi yo'nalishda?", "Kubizm",
                 ["Realizm", "Impressionizm", "Surrealizm"]),
            ],
            50: [
                ("Eng birinchi Oskar (1929) qaysi film?", "Wings",
                 ["Sunrise", "Casablanca", "Gone with the Wind"]),
                ("Salvador Dali qaysi mamlakat?", "Ispaniya",
                 ["Frantsiya", "Italiya", "AQSh"]),
                ("\"Inception\" rejissyori?", "Kristofer Nolan",
                 ["Vachovskilar", "Tarantino", "Koppola"]),
            ],
        },
    },
    {
        "name": "Musiqa va san'at",
        "icon": "🎵",
        "questions": {
            10: [
                ("Pianino nechta klavishali?", "88",
                 ["66", "76", "108"]),
                ("Skripka nechta tor?", "4",
                 ["3", "5", "6"]),
                ("\"Beatles\" qaysi mamlakat?", "Angliya",
                 ["AQSh", "Avstraliya", "Kanada"]),
            ],
            20: [
                ("Motsart qaysi mamlakat?", "Avstriya",
                 ["Germaniya", "Italiya", "Fransiya"]),
                ("\"Imagine\" qo'shig'i muallifi?", "Jon Lennon",
                 ["Pol Makkartni", "Mik Jagger", "Bob Dilan"]),
                ("Klassik gitarada nechta tor?", "6",
                 ["4", "5", "12"]),
            ],
            30: [
                ("Bethoven qaysi simfoniyasi mashhur?", "9-simfoniya",
                 ["5-simfoniya", "3-simfoniya", "7-simfoniya"]),
                ("Eng mashhur opera teatri?", "La Scala",
                 ["Bolshoy", "Metropolitan", "Covent Garden"]),
                ("Jazzning kelib chiqgan shahari?", "Nyu-Orlean",
                 ["Chikago", "Nyu-York", "Detroyt"]),
            ],
            40: [
                ("Madonna laqabi?", "Pop malikasi",
                 ["Rok malikasi", "R&B malikasi", "Soul malikasi"]),
                ("Strativarius nima?", "Skripka",
                 ["Pianino", "Gitara", "Nay"]),
                ("Salsa raqsi kelib chiqgan?", "Kuba",
                 ["Braziliya", "Argentina", "Meksika"]),
            ],
            50: [
                ("Eng qadimgi musiqa asbobi?", "Nay",
                 ["Baraban", "Tor", "Truba"]),
                ("Vivaldi qaysi mamlakat?", "Italiya",
                 ["Avstriya", "Germaniya", "Frantsiya"]),
                ("\"Bohemian Rhapsody\" gruhi?", "Queen",
                 ["The Beatles", "Pink Floyd", "Led Zeppelin"]),
            ],
        },
    },
]


class Migration(migrations.Migration):

    dependencies = [
        ("svoyak", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(forward, backward),
    ]
