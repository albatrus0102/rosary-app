# Rosary prayer app survey (global + Korean)

Survey date: 2026-11-12. Purpose: inform the menu/IA and UI/UX of a Korean Catholic rosary Android app.

## How to read this (method and limits)

- Sources: Google Play listings (KR and US storefronts) fetched on the survey date, the reviews Play shows on the listing page (only the top ~3 per app, so review themes are **anecdotal, not a statistical sample**), Hallow's help center, one independent roundup of rosary apps (Our Catholic Radio), a UX teardown of Hallow (screensdesign), and news coverage of the Vatican eRosary.
- **No app was installed or used hands-on.** Feature descriptions are mostly developer claims from store listings. Where a field says "not stated", the source did not say; it does not mean the feature is absent.
- Ratings/installs are Play Store figures on the survey date unless marked iOS.
- Play package ids are given so each listing can be opened as `https://play.google.com/store/apps/details?id=<id>`.

---

## 1. App-by-app findings

### A. Global apps

#### 1. Hallow: Prayer & Meditation (`app.hallow.android`)
- **What**: Audio-guided Catholic prayer/meditation platform (10,000+ sessions); rosary is one of its flagship daily prayers. Android, iOS, web.
- **Rating/installs**: 4.5 (124K reviews), 10M+ downloads. In-app purchases.
- **Navigation**: Five bottom tabs: **Home, Discover, Bible, Church (community), Me**. Home = daily quote, community challenges, prayer campaigns, games/trivia, featured collections, suggested prayers, plus shortcuts to Favorites, Downloads, Routines, Recent. Home cannot be personalized. Me = Streak (opt-in), Routines, Recently Prayed, Favorites, Downloads, Intentions, Reflections (journal); settings behind a gear icon.
- **Rosary screen**: An audio player, not a bead counter. Controls: play, +/-10 s, scrubber, an "equalizer" sheet for **guide voice, prayer length, background music, playback speed, sleep timer**; transcript button; playlist; share. An animated visual rosary companion was added in 2025 (per App Store text, secondary source). A personal intention can be entered and is overlaid on the player.
- **Extras**: Streaks (opt-in), routines (morning/night), reminders, journal, parish/friend groups, prayer intentions, challenges, downloads for offline, light/dark mode, Apple Health/Siri (iOS).
- **Onboarding**: Short personalization quiz, then a **paywall immediately after the quiz** (7-day trial converting to annual). Account required.
- **Monetization**: Subscription about $9.99/mo or $69.99/yr; rosary and daily prayers are in the free tier.
- **Complaints**: Repeated forced logouts; content moved behind the paywall; price; downloads still needing a connection; crashes/freezes; routines disappearing or duplicating; feature set feels overwhelming and things are hard to find (a reviewer could not find the 15-decade rosary).
- Sources: [Play](https://play.google.com/store/apps/details?id=app.hallow.android), [Hallow help: overview of the mobile app](https://help.hallow.com/en/articles/9650908-overview-of-the-mobile-app), [screensdesign teardown](https://screensdesign.com/showcase/hallow-prayer-meditation), [App Store](https://apps.apple.com/us/app/-/id1405323394), [Medium 6-month review](https://medium.com/catholicism-for-the-modern-world/catholic-prayer-app-hallow-6-month-review-88a699674229)

#### 2. Laudate (`com.aycka.apps.MassReadings`)
- **What**: "Most comprehensive" free Catholic reference app: daily readings, Liturgy of the Hours, Bible, Catechism, confession guide, and an interactive rosary plus many chaplets (Divine Mercy on the rosary screen, Seven Sorrows, St Michael, Franciscan Crown, Latin rosary). Android, iOS. 16 languages (no Korean listed).
- **Rating/installs**: 4.7 (31.4K), 1M+. No ads/IAP flagged.
- **Navigation**: Long menu/list of content categories (reference-library IA); calendar to pick the day. Bookmarks and user-created categorized prayers, import/export of prayers.
- **Rosary**: Interactive rosary with text; rosary and Stations podcasts for audio. Details of bead advance not stated in listing.
- **Complaints**: Parts need a connection and it is not clear which; content loads hang ("keeps searching"); Latin rosary option shows wrong text; iOS rating is notably lower (about 3.8).
- Sources: [Play](https://play.google.com/store/apps/details?id=com.aycka.apps.MassReadings), [CatholicMom review (2013, dated)](https://www.catholicmom.com/articles/2013/02/28/laudate-app-review)

#### 3. The Holy Rosary, Marcello Pietrelli (`app.rosario.it`)
- **What**: Dedicated rosary app; the most-installed single-purpose rosary app found. Localized in Korean on Play ("성 묵주 기도와 하느님의 자비심 기도").
- **Rating/installs**: 4.7 (73.3K), **5M+**. No ads/IAP flagged.
- **Rosary screen**: On-screen bead string with an illustration per mystery; mysteries auto-selected by weekday; audio version with auto-play; settings for **bead size and shape, vibration on each bead**, font size; Divine Mercy Chaplet and main prayers included.
- **Complaints**: Audio drifting **out of sync with the visuals**; auto-play skipping the mystery announcement or the Our Father; pause needing two presses; **enlarged text running off the screen** (no reflow).
- Source: [Play](https://play.google.com/store/apps/details?id=app.rosario.it)

#### 4. Rosary, Dmitry V Kotov (`ru.catholic.rosary`)
- **What**: Lightweight meditative rosary; donation-supported.
- **Rating/installs**: 4.6 (584), 50K+. IAP = donations.
- **Rosary screen**: Bead diagram; tap/swipe to advance, tapping a bead jumps there; picture, scripture reading and **"fruit of the mystery"** per decade; auto mystery of the day; Latin prayers; customizable color scheme; **sound and vibration on bead transition**; voice playback (TTS). Works offline.
- **Complaints**: Jump-by-touch confuses the start and end at the medal; language switch changes only menus, not prayers; **robotic TTS voice**.
- Source: [Play](https://play.google.com/store/apps/details?id=ru.catholic.rosary)

#### 5. Rosary Army (`com.newevangelizers.rosaryarmy`)
- **What**: Paid (about $4) audio-rosary app from the RosaryArmy.com apostolate: 4 traditional + 4 scriptural recordings plus a 20-mystery "Holy Hour Rosary". Android, iOS.
- **Rating/installs**: 4.8 (77), 1K+. Last updated Oct 2025.
- **Rosary**: Human, familiar voices at a steady pace; "SEE THEM" artwork per mystery; download once, play offline; background info on the devotion.
- **Praise**: "Real voices", "feel I'm with friends", "well-paced".
- **Complaints**: Playback **shuts off mid-rosary** and you lose your place; purchase/install glitch.
- Source: [Play](https://play.google.com/store/apps/details?id=com.newevangelizers.rosaryarmy)

#### 6. Click To Pray (`com.lamachi.clicktopray`) and Click To Pray eRosary
- **What**: Click To Pray is the Pope's Worldwide Prayer Network app (three short prayers a day, the Pope's monthly intentions, a wall of user intentions you "click to pray" for, rosary audio). The **eRosary** (2019, made with Acer's GadgeTek) was a 10-bead smart bracelet + companion app: activated by making the Sign of the Cross, choice of standard / contemplative / thematic rosaries, audio guide and images, per-mystery progress, count of completed rosaries, plus step/calorie tracking. Launch price about EUR 99.
- **Rating/installs**: Click To Pray 4.5 (3.92K), 100K+. eRosary iOS 3.68 (47 ratings); the Android eRosary listing was not found on Play on the survey date.
- **Complaints**: Forced login on every open, including when opening the rosary; "prayed" clicks not persisting; **notifications at wrong local times (time-zone handling)** and content not ready for users ahead of Rome; stale monthly content; eRosary reviewers did not understand how to pray with it (needs a tutorial).
- Sources: [Play: Click To Pray](https://play.google.com/store/apps/details?id=com.lamachi.clicktopray), [Aleteia](https://aleteia.org/2019/10/15/smart-rosary-brings-technology-to-tradition/), [App Store: eRosary](https://apps.apple.com/app/id1477960251), [IBTimes](https://www.ibtimes.co.uk/vatican-launches-110-click-pray-e-rosary-devout-millennials-1670468), [Inquirer](https://technology.inquirer.net/91486/the-vatican-launches-a-smart-connected-e-rosary-to-help-people-pray/amp)

#### 7. Rosary Prayer Audio With Beads, Mobeyosoft (`com.romeyosoft.rosaryhelper`)
- **Rating/installs**: 4.9 (20.9K), 500K+. Ads + IAP.
- **Features**: Text + audio for all prayers, bead counter, font size, mysteries by day, daily reminder, quote/verse of the day, **audio works offline and in the background**, male/female voices, meditative background music, traditional vs modern prayer wording, optional "pray with others around the world".
- **Complaints**: Audio must be downloaded and cannot be deleted afterwards; audio wording differs slightly from the text; users want a pause at each mystery.
- Source: [Play](https://play.google.com/store/apps/details?id=com.romeyosoft.rosaryhelper)

#### 8. Rosary Audio Catholic, NewJ Apps (`com.mollappsonline.rosaryaudiocatholic`)
- **Rating/installs**: 5.0 (17.3K), 100K+. Ads + IAP.
- **Features**: Animated bead counter, offline English audio, **auto-scrolling text synced to audio**, auto mysteries by day, daily notification, litany.
- **Complaints**: No reflective reading or **pause after the mystery is announced**; a long pause **resets the rosary to the beginning**; app freezes and needs reinstalling.
- Source: [Play](https://play.google.com/store/apps/details?id=com.mollappsonline.rosaryaudiocatholic)

#### 9. Rosario, Hozana (`com.hozana.rosario`)
- **What**: "Living Rosary" app: groups of 5 each pray one decade daily, so the group completes a rosary. Free, no ads/IAP.
- **Rating/installs**: 4.9 (22.8K), 500K+.
- **Features**: Invite 4 family/friends, daily decade assignment, shared intentions, audio rosary for solo use.
- **Takeaway**: The clearest example of a **small-group commitment mechanic** instead of an open social feed.
- Source: [Play](https://play.google.com/store/apps/details?id=com.hozana.rosario)

#### 10. Rosary App, devbrindy (`com.devbrindy.rosaryapp`)
- **Rating/installs**: 4.8 (156), 10K+. Free, no ads, optional IAP.
- **Rosary screen**: Opens straight to a **full-screen rosary**; beads change color as prayed; three bottom buttons (next, back, reset); **phone volume keys advance/go back**; **differentiated haptics (short for Hail Mary beads, longer for Our Father beads)** so it can be used without looking.
- **Complaints/requests**: No guidance for beginners (wants prayer text/steps), no page listing the mysteries, Latin requested.
- Source: [Play](https://play.google.com/store/apps/details?id=com.devbrindy.rosaryapp)

#### 11. Rosary Prayer: Beadly (`com.neilopena.beadly`)
- **Rating/installs**: 4.9 (29), 1K+. Free, no ads or subscription.
- **Features**: 3D rosary with pulsing current bead, guided text, **quick "one decade" mode**, streak, color customization, animated sky, vibration feedback. Users asked for an all-time total alongside the streak.
- Source: [Play](https://play.google.com/store/apps/details?id=com.neilopena.beadly)

#### 12. Other global reference points
- **Universalis** (`com.universalis.android.universalis`): 4.9 (5.01K), 50K+. Liturgy of the Hours + Mass readings; **paid once, with a separate free 30-day trial app**; fully offline; custom notifications. Not a rosary app, but the best-rated liturgical app found and a model for "pay once, everything offline". Bug noted: reopening a prayer at the last page read. [Play](https://play.google.com/store/apps/details?id=com.universalis.android.universalis)
- **iBreviary** (`com.netguru.ibreviary`): 3.3 (20.9K), 1M+. Low rating driven by the app **sticking on a stale date** and losing the loaded day on app switch. [Play](https://play.google.com/store/apps/details?id=com.netguru.ibreviary)
- **Oremus** (`com.oremus.catholic.bible.rosary.prayer`): 4.9 (970K), 10M+. Ads + IAP. Praised for audio + text together; criticized for **inappropriate third-party ads**, loud unstoppable notification chimes, and narration that cannot easily be silenced. [Play](https://play.google.com/store/apps/details?id=com.oremus.catholic.bible.rosary.prayer)
- **The Holy Rosary, MB4ANDROID** (`pl.mb.rozaniec`): 4.4 (5.18K), 500K+. TTS-based; complaints: no font size setting, mystery image cannot be enlarged, inaccurate translations/typos in prayers. [Play](https://play.google.com/store/apps/details?id=pl.mb.rozaniec)
- **My Rosary, Good Boy Niko** (`com.ask.myhumblerosary`): **home-screen widget showing today's mystery**, haptic on every bead, dark/light themes, free with a **one-time** purchase for human narration and background music. [Play](https://play.google.com/store/apps/details?id=com.ask.myhumblerosary)
- **Daily Rosary Meditations** (`com.mightybell.dailyrosarymeditations`): 4.8 (352). Podcast + community; complaint: audio stops and hands off to Spotify. [Play](https://play.google.com/store/apps/details?id=com.mightybell.dailyrosarymeditations)
- **iOS-only / roundup apps** (from the Our Catholic Radio review of 40+ rosary apps): **iRosary** (pull-chain beads you drag, left-hand mode, male/female voice; con: can skip only one bead at a time), **Rosarium** (Apple Watch digital crown as beads, Siri shortcuts; no audio or meditations), **Scriptural Rosary** (Bluetooth screen sync for group prayer, **record your own/family voices**; robotic default voice), **My Rosary** (streaks, "Roses to Mary" badges; goals not customizable), **Contemplatio** (full-screen art, live count of people praying, optional chant), **Mary** (meditations exist but are hard to find). [Our Catholic Radio](https://ourcatholicradio.org/node/68)
- Dominican/Franciscan: no dedicated, well-distributed Dominican or Franciscan rosary app was found on Play; the Franciscan Crown appears only as a chaplet inside Laudate.

### B. Korean apps

Korean weekday convention used by these apps: 월·토 환희, 화·금 고통, 수·일 영광, 목 빛.

#### 13. 성모님과 함께하는 묵주기도, 성바오로딸수도회 (`kara300.mookjukido`)
- **What**: The incumbent Korean rosary app, by the Daughters of St Paul. Android (+ iOS).
- **Rating/installs**: 4.4 (1.14K reviews), **100K+**. No ads, no IAP. Updated 2026-10-31.
- **Features**: Recorded meditation + prayer audio that sounds like a group praying (Pauline 2003 recording); **beads move automatically** with the audio; choose by weekday or pick any mystery; **prayer calendar that manages the 9일기도 over 56 days (including 빛의 신비)**; 9일기도 history to record the petition and graces received; intention entry; prayer alarm; original illustrations. Reviews mention speed control, resume, and decade selection. Uses the older 구원의 기도 wording, explained in the listing.
- **Praise**: No ads; essential for people with weak eyesight; keeps all intentions in one place.
- **Complaints**: **Audio stops intermittently when the screen is off**; wants sorting of intentions (newest first).
- Source: [Play](https://play.google.com/store/apps/details?id=kara300.mookjukido)

#### 14. 가톨릭 기도, Goodnews (`kr.or.catholic.rosario`) and 굿뉴스 묵주기도 (iOS)
- **What**: Official Goodnews (Seoul Archdiocese) prayer app; successor/companion to the iOS "굿뉴스 묵주기도".
- **Rating/installs**: 4.9 (44), 10K+. No ads/IAP. Updated 2026-10-08. (iOS 굿뉴스 묵주기도: 2.9 from 9 ratings; fixes for notch overlap and prayer-day counter reset.)
- **Features**: Rosary with 75-bead step-by-step text; 9일기도 cycle management; 삼종기도, 십자가의 길, 성체조배, 렉시오 디비나, 연도; alarms; intentions; **prayer calendar and stats with streak**; shrine map; liturgical calendar and today's Gospel. **Login optional**: everything works logged out, login syncs history across devices. iOS version: leader/responder (선창/후창) roles for group prayer, 100-day tracking. Galaxy Watch shows playback controls (media session).
- **Complaints**: **Audio stops when the screen turns off** even with the "continue with screen off" setting; **the mystery is not read aloud before the next decade starts**.
- Sources: [Play](https://play.google.com/store/apps/details?id=kr.or.catholic.rosario), [App Store: 굿뉴스 묵주기도](https://apps.apple.com/us/app/%EA%B5%BF%EB%89%B4%EC%8A%A4-%EB%AC%B5%EC%A3%BC%EA%B8%B0%EB%8F%84/id1672445545?l=ko)

#### 15. 가톨릭 묵주기도: Pray with me, AHopeBit (`ahope.bit.praywithme`)
- **Rating/installs**: 4.8 (45), 1K+. IAP. Updated 2026-11-06.
- **Features**: Sentence-by-sentence voice with **on-screen text advancing in sync**; playback speed; seek/pause; per-decade meditation topic; auto-advance; resume; daily Mass readings with liturgical color; searchable everyday prayers; weekly/monthly stats, streak, prayer time, badges, goals, calendar; Korean/English; voice choice; reminders.
- **Complaints**: **Text too small** (fine-grained size control was added in response); **the Sign of the Cross starts instantly on entry, so users rush**; chosen speed resets each session; wants a moment to offer intentions before starting; Angelus reminder defaulted to 11:00 instead of 12:00.
- Source: [Play](https://play.google.com/store/apps/details?id=ahope.bit.praywithme)

#### 16. 묵주기도 한걸음 (로사리움), AppHappytogether (`com.happytogether.rosarium_prayer_app`)
- **Rating/installs**: 4.7 (9), 1K+. Ads (stated: **never during prayer**).
- **Features**: 15/20-decade rosary; **mystery recommendation tied to the liturgical season**; resume; live progress; 화살기도 (short prayers, own or preset); **virtual votive candle** with an intention; liturgical season/color and D-day to feasts; **세례명 registration with feast-day notification** (217+ saints); stats (streak, mystery mix, time-of-day pattern, monthly calendar); daily "insight"; three notification types (streak nudge, morning verse, weekly report); WYD Seoul 2027 badge campaign.
- **Complaints**: **Background music is distracting and cannot be turned off.**
- Source: [Play](https://play.google.com/store/apps/details?id=com.happytogether.rosarium_prayer_app)

#### 17. 묵주기도 - 가톨릭 묵주 알 세기와 신비, Righthand (`com.righthand.mukjugido`)
- **Rating/installs**: New (10+ downloads), no rating. Ads (one bottom banner, none on the prayer screen).
- **Features (design intent worth noting)**: Silent bead counter for use with a physical rosary; current prayer in **large type**; advance by bottom prev/next buttons, **tap, or swipe up**; **distinct vibration on large beads and Glory Be so you know your place with eyes closed**; auto mystery of the day with manual override; scripture reference + short meditation for all 20 decades; Divine Mercy chaplet on the same beads; 14 prayers readable/shareable; Easter-season Regina Caeli shown first; Angelus (06:00/12:00/18:00) and 15:00 reminders; **resume with an exact label ("고통의 신비 3단 성모송 4번째부터 이어하기")**; totals, streak, month completion; 9일기도 and **54일 묵주기도 (27 petition + 27 thanksgiving) progress where missing a day does not break it**; no login, fully offline; text follows the CBCK 가톨릭 기도서.
- Source: [Play](https://play.google.com/store/apps/details?id=com.righthand.mukjugido)

#### 18. 어디서든 묵주기도, Gavi Lim (`com.rosaryprayers.app`)
- **Installs**: 500+, no ads/IAP.
- **Features**: Standard rosary; 청원/감사 (novena) rosary with 꽃다발 봉헌; 칠락 묵주기도; challenges: **54일 구일기도 (traditional or with 빛의 신비)**, 30/50/100-day streak challenges; calendar + dated prayer journal; font size, **alignment and font family choice**; **사도신경 / 니케아 신경 selection**; reminders.
- Source: [Play](https://play.google.com/store/apps/details?id=com.rosaryprayers.app)

#### 19. 묵주기도, NANODE (`kr.co.nanode.rosario.rosario`)
- **Installs**: 500+. Ads.
- **IA**: Home = 9일기도 status, today's Gospel, "말씀사탕" (verse), prayer history, alarm list. Sections: 묵주기도 (calendar, pray, **saves the Hail Mary count**), 9일기도 (calendar with status), 기도문, 설정 (confirm dialog before prayer, expand prayer text, background color, **launch straight into today's 9일기도 if not yet prayed**).
- Source: [Play](https://play.google.com/store/apps/details?id=kr.co.nanode.rosario.rosario)

#### 20. Korean general Catholic apps (context for IA and expectations)
- **가톨릭 (Goodnews)** (`kr.or.catholic.goodnews`): 4.3 (1.82K), **500K+**. Super-app: 매일미사 (with audio), 성가 (lyrics/audio/score), **성무일도 (with audio)**, 전국주보, 기도문/사목수첩, 성경, news, saints, nearby parishes/shrines, dictionary, CPBC radio/TV, 교리, **prayer-time alarms (아침/삼종/저녁, male/female voice, weekday repeat)**, boards, my parish. Complaints: app not opening after update; **prayer audio auto-playing aloud on launch/after reboot**; flaky audio buttons. [Play](https://play.google.com/store/apps/details?id=kr.or.catholic.goodnews)
- **매일미사 (Goodnews)** (`pk.catholic.missa`): 4.3 (3.85K), **1M+**. Complaints: **font-size buttons that make text smaller instead of larger, and not large enough for older users**; wants 15 to 30 days downloadable for offline; earlier: text not copyable, scroll position lost on returning to the app, poor typeface. [Play](https://play.google.com/store/apps/details?id=pk.catholic.missa)
- **굿뉴스 portal** (`pk.goodnews`): 4.1 (1.91K), 500K+, online only. Complaints: **Angelus audio blaring unexpectedly in an office**; Bible audio not continuing to the next chapter. [Play](https://play.google.com/store/apps/details?id=pk.goodnews)
- **가톨릭 하상 (한국천주교)** (`kr.catholic.hasangapp`): 4.0 (347), 100K+. Official CBCK app: offering payments, pilgrimage, faith-life goals, Bible reading. Complaints center on payment flow and audio stalling. [Play](https://play.google.com/store/apps/details?id=kr.catholic.hasangapp)
- **가톨릭(Catholic) 기도서, hk.ha** (`com.wooriaru.prayerbook`): 4.2 (284), 100K+, last updated 2022. Offline scores, pinch zoom; complaints: full-screen ads on exit, missing content. [Play](https://play.google.com/store/apps/details?id=com.wooriaru.prayerbook)
- **가톨릭 매일기도알람** (`kr.catholic.daily.prayer`): 4.2 (141), 10K+. Bell-sound alarms per prayer, Wear OS support. Complaints: alarm firing at midnight unprompted; unclear donation purchase. [Play](https://play.google.com/store/apps/details?id=kr.catholic.daily.prayer)
- **오늘의기도 - 가톨릭 기도수첩, Smithee** (`com.prayernew`): 1K+, no ads, optional donation. Daily checklist of prayers; rosary logged by mystery; 성체조배 time; confession reminder with examination questions; **기도요청 community with anonymous posting, "함께 기도하기", comments, report/block**. [Play](https://play.google.com/store/apps/details?id=com.prayernew)
- **오늘의복음, Smithee** (`com.yellowpg.gaspel`): 4.7 (100), 10K+. Question-guided Lectio Divina, **home-screen widget**, dark mode, small sharing groups (parish, 소공동체, family), no ads. Complaints: back button not exiting; login failure after changing phone. [Play](https://play.google.com/store/apps/details?id=com.yellowpg.gaspel)
- **새묵주기도, woorimodoo** (`com.softworld.updateflutter0523`): 4.1 (29), 10K+, ads. Review: **"game ads everywhere" and content (fortune, physiognomy) contrary to Catholic teaching**. A cautionary example. [Play](https://play.google.com/store/apps/details?id=com.softworld.updateflutter0523)
- **저절로 가톨릭 성경, W Bible** (`com.wafour.wcatholic`): 5.0 (12), 1K+, ads + IAP. Lock-screen verse, parish bulletin, step rosary with resume, attendance streak "missions". [Play](https://play.google.com/store/apps/details?id=com.wafour.wcatholic)
- **성바오로 서원** (`kr.paolo`): bookstore app of the Society of St Paul, not a prayer app. [Play](https://play.google.com/store/apps/details?id=kr.paolo)
- 성무일도: no standalone Korean Liturgy of the Hours app surfaced in Play search; it lives inside the Goodnews "가톨릭" app.

---

## 2. Comparison table

Legend: Y = stated, N = stated absent, - = not stated in sources. "Advance" = how the user moves through prayers.

| App | Rating / installs | Model | Rosary UI | Advance | Audio | Haptic | Font size | Offline | Auto mystery | Streak/stats | Intentions | Novena (9일/54일) | Social | Login |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Hallow | 4.5 / 10M+ | Subscription | Audio player (+animated rosary) | Auto (audio) | Human, multi-guide, speed, music, length | - | - | Downloads | Y | Y (opt-in) | Y (overlay) | N | Parish, groups | Required |
| Laudate | 4.7 / 1M+ | Free | Interactive + podcasts | Manual | Podcast | - | - | Partial | - | N | Own prayers | N | N | No |
| The Holy Rosary (Pietrelli) | 4.7 / 5M+ | Free | Bead string + art | Tap or auto-play | Recorded | Y per bead | Y (reflow bug) | - | Y | - | - | N | N | No |
| Rosary (Kotov) | 4.6 / 50K+ | Free + donate | Bead diagram + art, fruits | Tap/swipe, jump | TTS | Y + sound | - | Y | Y | - | - | N | N | No |
| Rosary Army | 4.8 / 1K+ | Paid ~$4 | Audio + artwork | Auto | Human, scriptural | - | - | Y | - | N | N | N | N | No |
| Click To Pray / eRosary | 4.5 / 100K+ | Free (+hardware) | Audio; bracelet beads | Auto / physical | Y | - | - | - | - | Count | Wall of intentions | N | Global wall | Required |
| Mobeyosoft Audio With Beads | 4.9 / 500K+ | Ads + IAP | Bead counter + text | Both | Human M/F, music, background | - | Y | Y | Y | - | - | N | Optional | - |
| Rosary Audio Catholic | 5.0 / 100K+ | Ads + IAP | Animated beads, auto-scroll text | Auto | Human | - | - | Y | Y | - | - | N | N | - |
| Rosario (Hozana) | 4.9 / 500K+ | Free | Group decade + audio | - | Y | - | - | - | Assigned | Group | Y shared | N | Groups of 5 | Required |
| Rosary App (devbrindy) | 4.8 / 10K+ | Free | Full-screen beads | Buttons, volume keys | N | Y differentiated | - | Y | - | N | N | N | N | No |
| Beadly | 4.9 / 1K+ | Free | 3D beads | Tap | N | Y | - | - | - | Streak | N | N | N | No |
| 성모님과 함께하는 묵주기도 (바오로딸) | 4.4 / 100K+ | Free, no ads | Auto-moving beads + art | Auto (audio) | Human group recording, speed | - | - | - | Y (calendar) | Calendar | Y + graces log | Y (56일) | N | - |
| 가톨릭 기도 (Goodnews) | 4.9 / 10K+ | Free, no ads | 75-bead stepper | Both | Y | - | - | - | - | Y | Y | Y | N | Optional |
| Pray with me | 4.8 / 1K+ | IAP | Synced text + voice | Auto | Voices, speed | - | Y | - | - | Y + badges, goals | - | N | N | - |
| 묵주기도 한걸음 | 4.7 / 1K+ | Ads (not in prayer) | Stepper + progress | - | Background music | - | - | - | Y (liturgical) | Y rich | Candle, 화살기도 | N | N | - |
| 묵주기도 (Righthand) | new | Ads (not in prayer) | Large-text stepper | Buttons, tap, swipe | N (by design) | Y differentiated | Large | Y | Y | Y | - | Y (9일, 54일) | N | No |
| 어디서든 묵주기도 | 500+ | Free | Text | - | - | - | Y + font, alignment | - | - | Calendar, journal | - | Y (54일 both ways) | N | - |

---

## 3. The 10 most valuable UX patterns to borrow

1. **Two first-class modes on one prayer screen: "listen" (auto-advancing audio) and "count" (silent, manual, for use with a physical rosary).** The market splits into audio players (Hallow, 바오로딸, Rosary Army) and silent counters (devbrindy, Righthand); users of each ask for the other (devbrindy reviewers want guidance; Oremus reviewers want the narrator off).
2. **Eyes-free advancing with differentiated haptics.** Short pulse for Hail Mary, longer for Our Father/Glory Be, plus tap-anywhere, swipe, and volume-key advance (devbrindy, Righthand, Kotov, Pietrelli). Reviewers single this out by name.
3. **Mystery of the day auto-selected, with one-tap override and "pray one decade" quick mode.** Nearly universal for auto-select; override and quick decade (Beadly) are the differentiators. Liturgical-season awareness (묵주기도 한걸음) is a refinement.
4. **Exact resume.** Persist position to the bead and label it in words ("고통의 신비 3단 성모송 4번째부터 이어하기", Righthand). The opposite (reset to start after a pause) is a named complaint.
5. **Announce the mystery, then pause.** Mystery title + scripture/meditation + art, followed by a configurable silence before the decade begins. Its absence is a complaint in both Goodnews and Rosary Audio Catholic; "fruits of the mystery" are valued (Kotov).
6. **Human, communal-sounding audio with speed control and call-and-response.** 바오로딸's group recording, Rosary Army's "feel I'm with friends", Goodnews iOS's 선창/후창 roles. Robotic TTS is a consistent negative. Persist the chosen speed and voice.
7. **Novena engine built for Korean practice.** 9일기도 and 54일 기도 (27 청원 + 27 감사), with or without 빛의 신비, a calendar that tells you today's mystery, a petition + "graces received" log, and forgiveness for a missed day (바오로딸, Righthand, 어디서든 묵주기도). This is the strongest Korea-specific retention feature and the main reason the Pauline app is loved.
8. **Intention before prayer, visible during prayer.** Enter or pick an intention at the start; show it on the prayer screen (Hallow overlay); keep a sortable list (바오로딸 users ask for sorting). The votive-candle metaphor (묵주기도 한걸음) is a light variant.
9. **Gentle, optional habit layer.** Calendar, streak, totals, optional badges, opt-in streak display (Hallow makes it opt-in), separate reminders per prayer with correct defaults (Angelus 06:00/12:00/18:00, Divine Mercy 15:00), and a home-screen widget for today's mystery (My Rosary, 오늘의복음).
10. **Trust signals: no login, fully offline, no ads on the prayer screen, texts from the CBCK 가톨릭 기도서, artwork/audio licenses credited.** Stated prominently by the best-reviewed small apps; optional login only for sync (Goodnews). For social, prefer small committed groups (Hozana's five-person Living Rosary, 오늘의복음's parish/family groups) over an open feed.

---

## 4. Common pitfalls and negative-review themes to avoid

| Pitfall | Seen in |
|---|---|
| **Audio stops when the screen turns off or the app is backgrounded** (the most repeated Korean complaint). Needs a proper foreground media service, media-session controls, and battery-optimization handling. | 바오로딸, 가톨릭 기도 (Goodnews), Rosary Army, 가톨릭 하상 |
| Audio and on-screen text/beads drifting out of sync; skipped prayers in auto-play; unresponsive pause. | The Holy Rosary (Pietrelli) |
| Position lost: reset to start after a long pause, on app switch, or on reopening. | Rosary Audio Catholic, iBreviary, 매일미사 (older) |
| Text too small, font control broken or too limited for older users, enlarged text overflowing the screen. | 매일미사, Pray with me, The Holy Rosary, pl.mb.rozaniec |
| Prayer starts too abruptly; no time for the Sign of the Cross or an intention; no mystery reading or pause between decades. | Pray with me, 가톨릭 기도, Rosary Audio Catholic |
| Unexpected sound: audio auto-playing on launch, alarms at unrequested times, loud chimes that cannot be stopped. | 가톨릭, 굿뉴스, 가톨릭 매일기도알람, Oremus |
| Background music or narration that cannot be turned off. | 묵주기도 한걸음, Oremus |
| Robotic TTS narration; inaccurate or auto-corrupted prayer text; language switch that changes menus only. | Kotov, pl.mb.rozaniec, Scriptural Rosary |
| Forced or repeated login; login broken after a phone change; paywall straight after onboarding; free content later moved behind the paywall. | Hallow, Click To Pray, 오늘의복음 |
| Intrusive or inappropriate ads, full-screen ads, off-doctrine filler content. | 새묵주기도, Oremus, 가톨릭 기도서 |
| Overloaded IA where the rosary or its options are hard to find. | Hallow, Laudate, Mary |
| Wrong reminder defaults and time-zone errors. | Pray with me (Angelus 11:00), Click To Pray |
| Unclear offline behavior; large audio downloads that cannot be deleted. | Laudate, Hallow, Mobeyosoft |
| Notch/system-bar overlap, back button not exiting, hidden-nav-bar conflicts. | 굿뉴스 묵주기도 (iOS), 오늘의복음, Universalis |

---

## 5. Gaps no surveyed app covers well (opportunities)

1. **One Korean app that does both audio-led and silent bead-counting well.** 바오로딸 owns audio + novena but has reliability complaints and no stated haptics; Righthand has the best silent/haptic design but no audio and almost no users. Nobody combines them.
2. **Reliable screen-off/background playback in Korean**, with lock-screen and watch controls. It is the top complaint against both major Korean rosary apps, so reliability alone is a differentiator.
3. **Senior-first accessibility.** Reviews show an older user base asking for much larger text and audio for weak eyesight. No app states TalkBack support, a true extra-large type mode with reflow, high-contrast theme, or large touch targets. Accessibility claims were absent from every listing surveyed.
4. **Pacing controls beyond playback speed**: adjustable silence after the mystery announcement, a lead-in before the Sign of the Cross, and per-decade pause. Requested repeatedly, offered by none.
5. **Group prayer for Korean parish life**: 레지오 마리애, 구역/반 모임, family rosary. Goodnews iOS has leader/responder roles and Hozana has five-person groups, but no Korean Android app offers shared intentions, a group 54일 기도, or leader/response audio (respond-only mode where the app prays one half).
6. **Wear OS / watch bead advance with haptics.** Rosarium does it on Apple Watch only; on Android there is only incidental media control (Goodnews) and an alarm app.
7. **Liturgically aware defaults done properly in Korean**: season-based mystery suggestions, October 묵주기도 성월 and May 성모성월 programs, 부활 삼종기도 switch, 세례명 feast day. Present piecemeal (묵주기도 한걸음, Righthand), nowhere complete.
8. **Wording options stated openly**: 구원의 기도 variants, 사도신경 vs 니케아 신경, optional closing prayers (성모 찬송, 교황님의 뜻대로), 20 vs 15 decades. Only 어디서든 묵주기도 and 바오로딸 touch this.
9. **Scriptural rosary in Korean** (a verse per Hail Mary) and "fruits of the mystery". Common in English apps (Rosary Army, Scriptural Rosary, Regina Caeli), not found in the Korean apps surveyed.
10. **Honest, low-friction monetization.** The well-liked models are free without ads (바오로딸, Goodnews), optional donation (Smithee, Kotov), or one-time purchase (Universalis, My Rosary). Subscription plus an onboarding paywall draws the harshest reviews. A Korean app with no ads on any prayer surface and an optional one-time support purchase is uncontested.
11. **Home-screen widget and quick resume** (today's mystery, novena day N of 54, one-tap continue): rare globally, absent from the Korean rosary apps surveyed.

---

## 6. IA implications (derived from the above)

- The best-reviewed dedicated apps open **directly onto the rosary or a single "today" card** (today's mystery, resume, novena day), not a content library. Super-app IA (Hallow, Laudate, Goodnews) draws "can't find it" complaints.
- A recurring, workable bottom-tab set across Korean apps: **오늘/홈 (today's mystery, resume, novena status) | 묵주기도 (mystery picker, modes) | 기도문 (prayer texts, search) | 기록 (calendar, streak, intentions, novena history) | 설정**. Daily Gospel/liturgical day appears on home as a secondary card in several apps (NANODE, 묵주기도 한걸음, Goodnews).
- Settings users actually ask for: font size (large range), audio on/off, voice, speed (persisted), background music on/off, haptics on/off, keep-screen-on, screen-off playback, pause lengths, theme (light/dark), wording options, reminders per prayer.

---

## 7. Source list

- Google Play listings (fetched 2026-11-12): package ids listed per app above, base URL `https://play.google.com/store/apps/details?id=`; Korean search results: https://play.google.com/store/search?q=묵주기도&c=apps&hl=ko&gl=KR
- Hallow help center: https://help.hallow.com/en/articles/9650908-overview-of-the-mobile-app and https://help.hallow.com/en/articles/3949390-overview-of-the-community-tab
- Hallow UX teardown: https://screensdesign.com/showcase/hallow-prayer-meditation
- Hallow reviews/coverage: https://medium.com/catholicism-for-the-modern-world/catholic-prayer-app-hallow-6-month-review-88a699674229 , https://www.ibtimes.co.uk/hallow-app-controversy-why-some-users-call-it-money-grab-why-its-banned-some-countries-1738240 , https://apps.apple.com/us/app/-/id1405323394
- Rosary app roundup (40+ apps): https://ourcatholicradio.org/node/68
- Catholic Answers Android recommendations: https://www.catholic.com/qa/rosary-app-suggestions-for-an-android-phone
- eRosary: https://aleteia.org/2019/10/15/smart-rosary-brings-technology-to-tradition/ , https://www.ibtimes.co.uk/vatican-launches-110-click-pray-e-rosary-devout-millennials-1670468 , https://technology.inquirer.net/91486/the-vatican-launches-a-smart-connected-e-rosary-to-help-people-pray/amp , https://apps.apple.com/app/id1477960251
- Laudate: https://www.catholicmom.com/articles/2013/02/28/laudate-app-review
- 굿뉴스 묵주기도 (iOS): https://apps.apple.com/us/app/%EA%B5%BF%EB%89%B4%EC%8A%A4-%EB%AC%B5%EC%A3%BC%EA%B8%B0%EB%8F%84/id1672445545?l=ko
- Rosarium (iOS): https://apps.apple.com/us/app/id1358741127
