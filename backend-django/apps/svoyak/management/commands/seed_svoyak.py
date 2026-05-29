"""Svoyak demo savol bazasi.

6 ta kategoriya × 5 bal qiymati × 3 variant = 90 ta savol.
A/B/C/D rejimi (har biri 3 ta plausible noto'g'ri variant bilan).

Foydalanish:
    python manage.py seed_svoyak           # qaytariladi, mavjudlarni o'tkazib yuboradi
    python manage.py seed_svoyak --force   # mavjud savollarni qaytadan yozadi
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.svoyak.models import SvoyakCategory, SvoyakQuestion


# Format: text, correct, [wrong1, wrong2, wrong3]
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
                ("Kitobat birinchi kim ixtiro qilgan?", "Yohan Gutenberg",
                 ["Leonardo da Vinci", "Nikola Tesla", "Galileo"]),
                ("Mirzo Ulug'bek qaysi shahar hokimi bo'lgan?", "Samarqand",
                 ["Buxoro", "Toshkent", "Xiva"]),
            ],
            50: [
                ("Birinchi olimpiya o'yinlari qaysi yilda o'tgan?", "Eramizdan avvalgi 776",
                 ["Eramizdan avvalgi 500", "Eramizdan avvalgi 1000", "Eramiz 100"]),
                ("Konstantinopol qachon Istanbulga aylangan?", "1453",
                 ["1492", "1517", "1389"]),
                ("Karl Bolqonlik bir-biriga qarshi imperiyasini qachon o'rnatgan?", "800",
                 ["750", "900", "1000"]),
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
            ],
            20: [
                ("Eng baland tog' cho'qqisi?", "Everest",
                 ["K2", "Mont-Blan", "Kilimanjaro"]),
                ("Yaponiya poytaxti?", "Tokio",
                 ["Kioto", "Osaka", "Yokohama"]),
                ("Sahroi Kabir qaysi qit'ada?", "Afrika",
                 ["Osiyo", "Avstraliya", "Janubiy Amerika"]),
            ],
            30: [
                ("Eng uzun daryo?", "Amazon",
                 ["Nil", "Yantszi", "Mississipi"]),
                ("Avstraliya poytaxti?", "Kanberra",
                 ["Sidney", "Melburn", "Pert"]),
                ("Bayqal ko'li qaysi davlatda?", "Rossiya",
                 ["Mo'g'ulustoni", "Qozog'iston", "Xitoy"]),
            ],
            40: [
                ("Vatikan qaysi shaharda joylashgan?", "Rim",
                 ["Florensiya", "Venesiya", "Milan"]),
                ("Nayagara sharsharasi qayerda?", "AQSh va Kanada",
                 ["Braziliya", "Venesuela", "Argentina"]),
                ("Eng kichik qit'a?", "Avstraliya",
                 ["Antarktika", "Yevropa", "Janubiy Amerika"]),
            ],
            50: [
                ("Maryana botig'i qaysi okeanda?", "Tinch okean",
                 ["Atlantika", "Hind", "Shimoliy muz"]),
                ("Sariq daryo qaysi davlatda?", "Xitoy",
                 ["Vetnam", "Hindiston", "Pokiston"]),
                ("Buyuk Korall rifi qayerda?", "Avstraliya",
                 ["Indoneziya", "Filippin", "Yangi Zelandiya"]),
            ],
        },
    },
    {
        "name": "Fan va texnika",
        "icon": "🔬",
        "questions": {
            10: [
                ("H2O nima?", "Suv",
                 ["Tuz", "Vodorod", "Kislorod"]),
                ("Quyosh tizimida nechta sayyora bor?", "8",
                 ["7", "9", "10"]),
                ("Insonning ko'p ishlaydigan organi?", "Yurak",
                 ["Jigar", "Miya", "O'pka"]),
            ],
            20: [
                ("Yorug'lik tezligi taxminan?", "300000 km/s",
                 ["150000 km/s", "1000000 km/s", "50000 km/s"]),
                ("Elektr toki o'lchov birligi?", "Amper",
                 ["Volt", "Vatt", "Om"]),
                ("Eng kichik element?", "Vodorod",
                 ["Geliy", "Karbonat", "Azot"]),
            ],
            30: [
                ("Telefon dasturini kim yaratgan?", "Aleksandr Bell",
                 ["Tomas Edison", "Nikola Tesla", "Albert Eynshteyn"]),
                ("DNK strukturasini kim kashf etgan?", "Uotson va Krik",
                 ["Mendel", "Darvin", "Paster"]),
                ("Pi (π) raqami taxminan?", "3.14",
                 ["2.71", "1.41", "1.62"]),
            ],
            40: [
                ("Birinchi sun'iy yo'ldosh?", "Sputnik 1",
                 ["Apollo", "Voyager", "Hubble"]),
                ("Atom yadrosini kim parchalagan?", "Ernest Rezerford",
                 ["Albert Eynshteyn", "Mariya Kyuri", "Niels Bor"]),
                ("Internet qaysi yilda kashf etilgan?", "1969",
                 ["1980", "1990", "1960"]),
            ],
            50: [
                ("Eng tez kompyuter (2023) qaysi mamlakat?", "AQSh",
                 ["Yaponiya", "Xitoy", "Germaniya"]),
                ("Higgs bozon qaysi yilda kashf etilgan?", "2012",
                 ["2005", "2015", "2020"]),
                ("Marsda birinchi rover qachon qo'ngan?", "1997",
                 ["1990", "2000", "2003"]),
            ],
        },
    },
    {
        "name": "Sport",
        "icon": "⚽",
        "questions": {
            10: [
                ("Futbolda nechta o'yinchi maydonda?", "11",
                 ["9", "10", "12"]),
                ("Olimpiya o'yinlari necha yilda bir?", "4 yilda",
                 ["2 yilda", "3 yilda", "5 yilda"]),
                ("Eng mashhur futbol kubogi?", "Jahon kubogi",
                 ["Yevro", "Premyer Liga", "Champions League"]),
            ],
            20: [
                ("Tennisda 'Grand Slam' nechta turnir?", "4",
                 ["3", "5", "6"]),
                ("Basketbolda nechta o'yinchi maydonda?", "5",
                 ["4", "6", "7"]),
                ("Bokschi Muhammad Ali aslida ismi nima?", "Kassiy Kley",
                 ["Maykl Tayson", "Joy Frejyer", "Sugar Rey"]),
            ],
            30: [
                ("Reyal Madrid qaysi mamlakatda?", "Ispaniya",
                 ["Italiya", "Portugaliya", "Fransiya"]),
                ("Mashhur 'Maracana' stadioni qayerda?", "Braziliya",
                 ["Argentina", "Uruguay", "Meksika"]),
                ("Pinpong (stol tennisi) qayerdan kelib chiqqan?", "Angliya",
                 ["Xitoy", "Yaponiya", "Germaniya"]),
            ],
            40: [
                ("Eng ko'p Champions League yutgan klub?", "Reyal Madrid",
                 ["Barselona", "Bavariya", "Milan"]),
                ("Tennischi Rojer Federer qaysi davlatda tug'ilgan?", "Shveytsariya",
                 ["Avstriya", "Germaniya", "Niderlandiya"]),
                ("Sport gimnastikasi qaysi davlatda kuchli rivojlangan?", "Rossiya",
                 ["Xitoy", "Amerika", "Ruminiya"]),
            ],
            50: [
                ("Birinchi zamonaviy olimpiya qachon o'tgan?", "1896",
                 ["1900", "1888", "1912"]),
                ("Lionel Messi qaysi yilda 'Oltin to'p' birinchi marta yutgan?", "2009",
                 ["2008", "2010", "2011"]),
                ("Formula 1'da Aerton Senna qaysi davlat fuqarosi?", "Braziliya",
                 ["Argentina", "Italiya", "Niderlandiya"]),
            ],
        },
    },
    {
        "name": "Kino va madaniyat",
        "icon": "🎬",
        "questions": {
            10: [
                ("'Titanic' filmi qachon chiqqan?", "1997",
                 ["1995", "1999", "2001"]),
                ("Harri Potter kitobini kim yozgan?", "J.K. Rouling",
                 ["Stephen King", "Dan Brown", "J.R.R. Tolkien"]),
                ("Disney kompaniyasi qaysi mamlakatda?", "AQSh",
                 ["Yaponiya", "Buyuk Britaniya", "Fransiya"]),
            ],
            20: [
                ("'Avatar' filmi rejissori kim?", "Jeyms Kameron",
                 ["Stiven Spilberg", "Quentin Tarantino", "Martin Skorseze"]),
                ("Mona Liza rasmi kim ishlagan?", "Leonardo da Vinchi",
                 ["Mikelanjelo", "Rafael", "Van Gog"]),
                ("'O'tkan kunlar' romanini kim yozgan?", "Abdulla Qodiriy",
                 ["Cho'lpon", "Oybek", "Hamid Olimjon"]),
            ],
            30: [
                ("'Inception' filmi rejissori?", "Kristofer Nolan",
                 ["David Fincher", "Ridli Skott", "Pol Anderson"]),
                ("'Don Kixot' romanini kim yozgan?", "Servantes",
                 ["Shekspir", "Gyote", "Dante"]),
                ("Birinchi Oscar ne yil bo'lib o'tgan?", "1929",
                 ["1920", "1935", "1945"]),
            ],
            40: [
                ("Pikasso qaysi davlatda tug'ilgan?", "Ispaniya",
                 ["Fransiya", "Italiya", "Niderlandiya"]),
                ("'Krestoonosli' (The Godfather) rejissori?", "Frensis Ford Koppola",
                 ["Martin Skorseze", "Stiven Spilberg", "Stenli Kyubrik"]),
                ("Bethoven qaysi mamlakatda tug'ilgan?", "Germaniya",
                 ["Avstriya", "Italiya", "Polsha"]),
            ],
            50: [
                ("Stenli Kyubrikning '2001: A Space Odyssey' qachon chiqqan?", "1968",
                 ["1965", "1972", "1975"]),
                ("Akira Kurosava qaysi millat rejissori?", "Yapon",
                 ["Xitoy", "Koreys", "Vetnam"]),
                ("Birinchi tovushli kino qaysi?", "The Jazz Singer",
                 ["Citizen Kane", "Metropolis", "Gone with the Wind"]),
            ],
        },
    },
    {
        "name": "Musiqa va san'at",
        "icon": "🎵",
        "questions": {
            10: [
                ("'Yesterday' qo'shig'ini kim aytgan?", "Beatles",
                 ["Rolling Stones", "Queen", "Elvis"]),
                ("Pianino nechta klavishaga ega?", "88",
                 ["76", "100", "64"]),
                ("Maykl Jekson qaysi davlatdan?", "AQSh",
                 ["Buyuk Britaniya", "Kanada", "Avstraliya"]),
            ],
            20: [
                ("Mocart qaysi yashar?", "Avstriya",
                 ["Germaniya", "Italiya", "Fransiya"]),
                ("'Bohemian Rhapsody' qaysi guruh?", "Queen",
                 ["Beatles", "Led Zeppelin", "Pink Floyd"]),
                ("Gitarada odatda nechta tor?", "6",
                 ["4", "5", "7"]),
            ],
            30: [
                ("'Eline Eline' Munisaning qaysi qo'shig'i?", "Sevgi haqida",
                 ["Vatan", "Tabiat", "Bahor"]),
                ("Devid Boui qaysi davlatdan?", "Buyuk Britaniya",
                 ["AQSh", "Kanada", "Avstraliya"]),
                ("Saksafonni kim ixtiro qilgan?", "Adolph Sax",
                 ["Mocart", "Beethoven", "Stradivari"]),
            ],
            40: [
                ("Eng mashhur ballet 'Yong'in qushi' kim bastalagan?", "Stravinski",
                 ["Chaykovskiy", "Prokofyev", "Raxmaninov"]),
                ("Vivaldi 'To'rt fasl' qaysi davlatda yaratgan?", "Italiya",
                 ["Fransiya", "Germaniya", "Avstriya"]),
                ("'Imagine' qo'shig'ini kim yozgan?", "Jon Lennon",
                 ["Pol Makkartni", "Yoko Ono", "Jorj Harrison"]),
            ],
            50: [
                ("Hindistondagi tabla cholg'usi necha qismdan iborat?", "Ikki",
                 ["Bir", "Uch", "To'rt"]),
                ("Sitar mashhur cholg'usi qaysi davlatdan?", "Hindiston",
                 ["Eron", "Tojikiston", "Misr"]),
                ("Birinchi vinil disk qachon chiqarilgan?", "1948",
                 ["1935", "1955", "1960"]),
            ],
        },
    },
]


class Command(BaseCommand):
    help = "Svoyak demo kategoriyalari va 90+ savolni qo'shadi"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Mavjud savollarni yangilaydi (matn bo'yicha solishtirib)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        force = options.get("force", False)
        cat_added = 0
        cat_updated = 0
        q_added = 0
        q_updated = 0
        q_skipped = 0

        for cat_idx, cat_data in enumerate(CATEGORIES_DATA):
            cat, created = SvoyakCategory.objects.get_or_create(
                name=cat_data["name"],
                defaults={
                    "icon_emoji": cat_data["icon"],
                    "order": cat_idx,
                    "is_active": True,
                    "language": "uz-latn",
                },
            )
            if created:
                cat_added += 1
                self.stdout.write(self.style.SUCCESS(
                    f"+ Kategoriya yaratildi: {cat.icon_emoji} {cat.name}"
                ))
            elif force:
                cat.icon_emoji = cat_data["icon"]
                cat.order = cat_idx
                cat.is_active = True
                cat.save()
                cat_updated += 1

            for value_tier, questions in cat_data["questions"].items():
                for text, correct, wrongs in questions:
                    existing = SvoyakQuestion.objects.filter(
                        category=cat, text=text
                    ).first()
                    if existing:
                        if force:
                            existing.value_tier = value_tier
                            existing.correct_answer = correct
                            existing.wrong_answers = list(wrongs)
                            existing.question_type = "abcd"
                            existing.is_active = True
                            existing.save()
                            q_updated += 1
                        else:
                            q_skipped += 1
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
                    q_added += 1

        total_cats = SvoyakCategory.objects.count()
        total_qs = SvoyakQuestion.objects.count()
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"Tayyor:\n"
            f"  Kategoriya:  +{cat_added} yangi, {cat_updated} yangilangan\n"
            f"  Savollar:    +{q_added} yangi, {q_updated} yangilangan, {q_skipped} mavjud\n"
            f"  Jami DB'da:  {total_cats} kategoriya, {total_qs} savol"
        ))
