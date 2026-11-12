# Survey: 3D / VR / metaverse prayer spaces and mobile 3D social rooms

Purpose: inform the UX of a mobile (Android WebView, three.js) "cyber cathedral" with joystick walking, pew seating, shared prayer, candles and avatar customization.
Date of research: 2026-11-12. Method: web search and page fetches only.

## How to read this

Evidence labels used throughout:

- **[S]** sourced: stated in a page I retrieved in this pass (URL given).
- **[B]** background: my prior knowledge of the product, not re-verified in this pass. Check on a device before relying on it.
- **[I]** inference: a design conclusion I drew; not a fact about any product.

Gaps, stated up front:

- I found **nothing** on "책 마실", "독서공방" or "Pocket Gather" as 3D room apps. They may be small or vibe-coded services under a different spelling. The closest sourced analogues are the Korean vibe-coded rooms (Sansa, Chanmi, Riverside Camp, Sauna Goyo) and Zoom/ifland reading rooms.
- The VRChat mobile-controls help page returned 403 and the Heidelberg Second Life paper returned 503, so those rows rest on search snippets plus [B].
- No retrieved source gives phone-specific motion-sickness data; the available guidance is VR-headset research.
- Most church-in-metaverse press is from 2021-2022; AltspaceVR itself was shut down by Microsoft in March 2023 [B], so those services have since moved or ended.
- None of the Korean articles gave URLs for Sansa, Chanmi, Goyottul or Inpis, and none describes Chanmi's controls or HUD.

---

## 1. Individual profiles

### 1.1 Korean vibe-coded sanctuaries (Oct-Nov 2026): Sansa, Chanmi, Goyottul, Inpis, Online Gatbawi

The most relevant precedent: browser-based, phone-first, no install, almost exactly the product being built.

- **Platform:** plain website, opened on a phone, no install or headset [S]. Built by individuals with AI-assisted "vibe coding"; Sansa's maker is a 26-year-old job seeker without a CS background [S].
- **Sansa (산사, Buddhist temple):** forest temple with a large Buddha in the main hall. Everyone enters as the same child-monk avatar with a randomly assigned poetic name ("Leisurely Cloud", "Soft Moonlight"). Actions: walk, press palms to greet (hapjang), kneel on a cushion, bow (including the 108 bows), turn prayer beads, strike a moktak, listen to chant [S]. **No chat or messaging at all**; the palms-together greeting is the only contact [S]. Rice-offering donation feature, reported elsewhere as KakaoPay offering [S].
- **Scale and load:** 10,000+ visitors on day one strained the server; the developer raised concurrent capacity from 20 to 10,000; 900,000+ cumulative visits by Oct 31, then past 1 million; 100,000+ per day [S]. (Launch date is reported as Oct 26 by Korea Times and Oct 29 by Korea Herald/Seoul Shinmun.)
- **Chanmi (찬미, Catholic church):** pews, votive candles, rosaries, traditional hymns, and **Angelus bells at 06:00, 12:00 and 18:00**; avatars sit in pews and pray [S].
- **Goyottul (Protestant):** share prayer requests, listen to sermons [S].
- **Inpis (인피스, Catholic):** user picks a famous cathedral (Notre-Dame, Sagrada Familia) as the venue [S, via a blog re-post of a Hankyung article; original not checked].
- **Online Gatbawi:** bow or press palms before a giant Buddha to make a wish; about 300 concurrent [S].
- **Why it works, per users and academics:** "you connect once and just make a wish"; one user deleted Zepeto after two days because avatar customization and social interaction felt like a burden; "alone yet together" (Prof. Kim Sang-gyun); peace and sacredness without joining a community (Prof. Sung Hae-young); "a quiet place to rest without having to speak" (the developer) [S].
- **Requested features:** tapdori (circling the pagoda), being struck with the jukbi stick [S]. Users ask for more *ritual verbs*, not more chat.
- **Complaints:** none reported in press; the visible problem was server capacity [S].
- Sources: https://www.koreaherald.com/article/10921693 · https://asianews.network/?p=311927 · https://www.koreatimes.co.kr/southkorea/20261103/ai-built-virtual-buddhist-temple-draws-1-mil-visitors-in-less-than-a-week · https://www.seoul.co.kr/news/newsView.php?id=20261105032003 · https://blog.ai.dmomo.co.kr/news/37037

### 1.2 VR Church (D.J. Soto) on AltspaceVR / VRChat

- **Platform:** VR headsets and desktop; founded 2016; grew from a handful to about 200 [S].
- **Format:** 5-10 minutes of worship music, short sermon, then informal discussion; moved from sermons toward experiential formats such as walking through 3D biblical scenes; avatar baptisms in a pool [S].
- **Immersive:** "I couldn't have had such an immersive church experience sitting in my pew"; valued by homebound people and people with social phobia [S].
- **Awkward:** theological objection to virtual sacraments; any avatar allowed, which sits oddly with solemnity [S].
- Sources: https://wordandway.org/2022/02/01/faith-in-the-metaverse-a-vr-quest-for-community-fellowship/ · https://fortune.com/2022/01/31/virtual-worshipping-services-religion-metaverse/ · https://eteknix.com/christian-pastor-conducts-digital-baptisms-in-virtual-reality · https://ryanschultz.com/2017/10/21/religion-spirituality-and-virtual-reality/

### 1.3 Life.Church and other AltspaceVR / Horizon Worlds churches

- **Platform:** AltspaceVR (Dec 2021 launch), later a custom campus modelled on a physical building [S].
- **Visitor report (Christian Post):** cinema-style screens, could raise virtual hands, pastor approached afterwards. But: about 10 people in the auditorium, alone at another church, many unused rooms, a generic template auditorium elsewhere, sermon audio audible outside so he wandered off, $300 headset and a failed avatar upload on VRChat, and "the social pressure is almost non-existent" so people drift in and out [S]. The most meaningful moment was a long small-group conversation and praying with one person, not the service [S].
- **Safety:** harassment reports in Horizon Worlds led Meta to add a default 4-foot **Personal Boundary** (later adjustable), Voice Mode, and an option to **garble strangers' voices** into unintelligible sounds; press criticized onboarding that drops newcomers straight into live voice with strangers [S].
- Sources: https://www.christianpost.com/news/i-went-to-church-in-the-metaverse-and-this-is-what-i-found.html · https://julieroys.com/life-church-multi-site-megachurch-virtual-reality · https://about.fb.com/news/2022/02/personal-boundary-horizon/ · https://www.engadget.com/meta-horizon-worlds-personal-boundary-update-182754958.html · https://www.faithwire.com/2022/02/02/dangers-in-cyberspace-woman-says-she-was-virtually-gang-raped-in-facebooks-metaverse

### 1.4 VRChat worship worlds (and VRChat on Android)

- **Worship:** Christian fellowship in a "cavernous virtual cathedral with stained-glass light"; attendees mostly teens and young adults who share why they came at the end; members disclose crises more readily behind avatars [S].
- **Mobile controls:** screen-edge taps/holds turn the view; rotation speed, look sensitivity and field of view are adjustable in Quick Menu > Settings > Mobile; tapping a user or portal opens a secondary menu [S]. Left virtual stick, drag-to-look and a jump button [B].
- **Performance tactics:** avatar **performance ranks** (Excellent to Very Poor) with a user-set minimum rank and fallbacks; mobile shader whitelist; 100 MB world cap; a "Sustained Performance Mode" for steadier frame rate and less heat; needs Android 10+ and about 6 GB RAM [S].
- **Moderation:** trust ranks shown on nameplates [S, fan wiki], per-user block/mute [B].
- Sources: https://help.vrchat.com/hc/en-us/articles/19659443577491-VRChat-Mobile-Controls · https://creators.vrchat.com/avatars/avatar-performance-ranking-system/ · https://creators.vrchat.com/platforms/android/quest-content-optimization · https://docs.vrchat.com/docs/vrchat-202332m · https://wiki.vrchat.com/wiki/Controls

### 1.5 Rec Room (screen/touch mode)

- **Controls:** dedicated touch HUD, redesigned in 2020; touch players can "Reach" their hands forward to interact; HUD hides when a gamepad is attached; tapping the screen returns to touch mode [S].
- **Menu:** everything hangs off one "Watch" menu [S].
- **Safety:** two sliders: **Personal Space** (others cannot come closer) and **Ignore Bubble** (others inside it become invisible) [S].
- Sources: https://recroom.com/ship-notes/2020/8/31/rec-room-update-the-ambidextrous-edition · https://recroom.com/ship-notes/2020/12/14/rec-room-update-the-reaching-and-waving-edition · https://blog.recroom.com/posts/2022/5/26/updating-our-screens-controls · https://rec-room.fandom.com/wiki/Watch_Menu

### 1.6 Roblox: The Robloxian Christians and Roblox mobile controls

- **Church:** TRC, since 2011: weekly in-game services with Scripture, sermon, **worship through typed chat**, Bible studies, life groups; participation fell sharply in recent years; has a manual and named safety contact; "be bad, mean, or troll, you will be banned" [S].
- **Controls (the reference standard for young mobile users):** default **Dynamic Thumbstick** appears wherever the thumb lands in the lower-left region; separate **jump button lower-right**; **drag to rotate camera, pinch to zoom**; auto-jump over low obstacles is on by default; five orientation modes with landscape default; haptics API; gamepad detection that swaps the on-screen UI [S]. "The majority of Roblox sessions are played on mobile" [S].
- **HUD:** small top-left system buttons (menu, chat), emote wheel, proximity prompts that appear as a floating button near an interactable [B].
- **Moderation:** platform-level real-time AI moderation that can shut down a single server instance; an arXiv study shows flagged users evade filters [S].
- Sources: https://create.roblox.com/docs/scripting/input/mobile-input · https://create.roblox.com/docs/reference/engine/enums/DevTouchMovementMode.md · https://devforum.roblox.com/t/a-renewed-vision-the-robloxian-christians/2007251 · https://devforum.roblox.com/t/the-robloxian-christians-manual/190757 · https://about.roblox.com/newsroom/2026/03/safety-snapshot-march · https://arxiv.org/abs/2605.04491

### 1.7 Second Life: Anglican Cathedral of Second Life (Epiphany Island)

- **Platform:** desktop viewer; the official mobile viewer is deliberately simplified [S].
- **Design stance:** built 2007 as a faithful medieval cathedral because existing SL churches were "poor imitations"; a 2010 academic paper is titled "The Politics of Familiarity: Visual, Liturgical and Organisational Conformity in the Online Church" [S]. Familiar architecture and liturgy are what make it read as church.
- **Seating:** sit scripts live in the furniture itself ("the seat is effectively the poseball"), fixing position and rotation, four to a pew; known bug class: standing up from a complex object throws the avatar off in a random direction [S].
- **Complaints:** students said it "didn't actually feel like we were there and it was easy to lose concentration"; attendance "gone down quite significantly"; consensus to avoid virtual sacraments [S].
- Sources: https://heiup.uni-heidelberg.de/journals/religions/article/view/9385 · https://anglicannews.org/news/2012/04/students-experience-online-worship-for-the-first-time.aspx · https://www.christiantoday.com/news/what-happened-to-online-churches · https://forums-archive.secondlife.com/54/c3/351288/1.html · https://feedback.secondlife.com/mobile-public-beta-features

### 1.8 Minecraft: Vatican "Digital Jesuit" server and Pro Deo MC

- **Vatican-linked server (Fr. Robert Ballecer, 2019):** church with pews, font and garden, and a **beacon that changes to the liturgical colour of the season**; aimed at a less toxic space; DDoS-attacked immediately [S].
- **Pro Deo MC:** Catholic roleplay server with Western and Eastern rite liturgies, carrying an explicit disclaimer that roleplay Masses have **no sacramental value** and urging real attendance [S].
- Sources: https://www.pcgamer.com/the-vatican-has-its-own-minecraft-server · https://www.insights.uca.org.au/vatican-gets-minecraft-server/ · https://medium.com/catholicism-for-the-modern-world/catholicism-and-gaming-minecraft-as-a-medium-for-evangelization-db32fe97c2b · https://religionnews.com/?p=2888565

### 1.9 ZEPETO worlds

- **Controls:** the World SDK spawns a standard **V-pad** (virtual pad) at runtime; it is customizable; gyro input is available; the official tutorial teaches **interaction buttons that appear when the user approaches an object** [S]. Left stick, right jump button, gesture/emote button and drag-to-look [B].
- **Avatar:** the product's core is deep avatar fashion; a Korean user in the 2026 coverage quit after two days because customization and socializing felt like work [S].
- **Status:** Naver deconsolidated Naver Z in 2024; SK Telecom's ifland closed in 2025 [S].
- Sources: https://naverz-group.readme.io/studio-world/docs/vpad_customize · https://naverz-group.readme.io/studio/lang-id/reference/tutorial_overview · https://naverz-group.readme.io/studio/docs/world_guidelines · https://www.seoul.co.kr/news/newsView.php?id=20261105032003

### 1.10 Gather (Gather Town) chapels and quiet rooms

- **Platform:** 2D top-down; desktop-first.
- **Mobile:** the native app **cannot move the avatar at all**; it is meetings-only, with no wave/ring/follow and chat limited to meetings. In a mobile browser you move by **double-tapping a destination or holding and dragging** [S]. Quiet Mode toggle reached mobile in 2021 [S].
- **Social:** proximity audio/video, private areas, quiet mode [S].
- **Lesson [I]:** even a well-funded product gave up on free movement on phones; and tap-to-move is the accepted fallback.
- Sources: https://support.gather.town/articles/7619450362-gather-1-0-on-mobile-browsers · https://support.gather.town/hc/en-us/articles/17580563233684 · https://support.gather.town/hc/en-us/articles/15909782743444 · https://gathertown.canny.io/changelog/updates-for-september-27-2021

### 1.11 Virtual pilgrimage and church tours: St Peter's digital twin, Sistine Chapel 360, Eternal Notre-Dame, Google Arts & Culture

- **St Peter's "AI-Enhanced Experience" (Vatican + Microsoft + Iconem, Nov 2024):** photogrammetric twin from about 400,000 images; web tour in four languages, guided options, and booking of real visits [S].
- **Vatican Museums / Sistine Chapel:** linked 360 panoramas; **arrows step between fixed viewpoints**, rotate and zoom within each [S].
- **Eternal Notre-Dame (Orange/Emissive):** 45-minute guided group VR; praised for storytelling; complaints about weak sound, group-size management and technical hiccups [S].
- **Google Arts & Culture:** Street View style node hopping in 2,000+ institutions [S].
- **Lesson [I]:** solo, guided, node-based movement avoids both motion sickness and control learning, but there is no co-presence. A "guided tour" mode is a good low-end fallback.
- Sources: https://www.vaticannews.va/en/vatican-city/news/2024-11/ai-technology-st-peters-basilica-digital-experience-microsoft.print.html · https://petapixel.com/2024/11/14/vatican-used-400000-photos-to-create-digital-twin-of-st-peters-basilica · https://www.openculture.com/2025/05/take-a-3d-virtual-tour-of-the-sistine-chapel.html · https://www.ccsinsight.com/blog/hope-springs-eternal/ · https://www.funbooker.com/en/listing/ticket-for-the-eternal-notre-dame-immersive-experience-in-paris-1/show?reviewSort=recent

### 1.12 Sky: Children of the Light (mobile social 3D reference, not religious)

- **Consent-gated social:** strangers are grey silhouettes until **both hold out a candle**; friending costs a candle; chat is confined to **two-person "talking benches"**; hand-holding leads newcomers around; social power must be earned, as a preventative alternative to reporting [S].
- **Result:** widely described as the "kindest" MMO; players say it made them feel less alone [S].
- Sources: https://www.pcgamer.com/games/mmo/nobody-is-born-toxic-says-journeys-creative-director-while-preparing-to-launch-the-kindest-mmo-on-pc · https://mobilegamer.biz/jenova-chen-explains-why-theres-no-teabagging-in-sky-children-of-the-light/ · https://gamedeveloper.com/design/using-emotion-to-drive-social-play-in-i-sky-children-of-the-light-i-

### 1.13 Non-3D "pray together" apps: Hallow, online parishes

- **Hallow:** pray privately or invite a community; intentions attached to a session and the group is notified when you finish; seasonal group challenges; parish groups [S]. No live presence counter was confirmed.
- **Brisbane online parish, Quiapo daily online rosary:** demand for digital devotion persisted after the pandemic [S].
- Sources: https://intercom.help/hallow-inc/en/articles/10618520-how-to-share-prayer-requests-and-pray-for-intentions-in-hallow · https://aleteia.org/2020/04/22/popular-catholic-meditation-app-makes-it-easy-to-pray-with-others · https://www.inqld.com.au/news/2021/11/26/good-lord-brisbanes-catholics-the-first-to-have-church-without-a-church

### 1.14 Reading-room style spaces (closest sourced analogues to 책 마실 / 독서공방)

- **Semoram "room-corner book cafe":** people gather on Zoom and each read silently; camera optional; 15 minutes of reading counts as attendance [S].
- **ifland reading club:** avatar room with voice only; the host eventually moved to Zoom [S].
- **Riverside Camp, Sauna Goyo:** vibe-coded 3D rooms where the whole activity is sitting near others (campfire, pools) [S].
- **Lesson [I]:** "body doubling" in silence is the product; a timer-based attendance stamp is enough reward.
- Sources: https://maily.so/semoram/posts/2qzpyqqyz4x · https://brunch.co.kr/@wybook/1381 · https://www.koreatimes.co.kr/southkorea/20261103/ai-built-virtual-buddhist-temple-draws-1-mil-visitors-in-less-than-a-week

---

## 2. (a) Comparison table

| # | Space | Platform | Mobile movement / camera | HUD / menu | Avatar | Social | Onboarding | Perf / battery | Moderation | Immersive | Awkward / complaints |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Sansa, Chanmi, Goyottul (KR, 2026) | Mobile web, no install [S] | Walk around; details unreported | Few ritual buttons (bow, palms, beads) [S] | One default avatar, random poetic name [S] | No chat; palms greeting; sit/pray side by side [S] | None needed; "enter and bow" [S] | Server cap raised 20 to 10,000 [S] | Nothing to moderate: no text [S] | Bells on the hour, chant, ritual verbs | Server overload; shallow long-term loop [I] |
| 2 | VR Church | AltspaceVR, VRChat | Headset/desktop | Platform default | Any avatar | Voice, discussion, baptism [S] | Greeters | n/a | Host tools | 3D scripture scenes [S] | Sacrament validity; hardware cost |
| 3 | Life.Church etc. | AltspaceVR / Horizon | Headset | Platform default | Platform avatars | Voice, hand-raise, pastor follow-up [S] | Staff greeter [S] | n/a | Personal Boundary, voice garble [S] | Pastor walks up to you | 10 people in a hall; empty rooms; audio bleed; drop-in/out [S] |
| 4 | VRChat worship worlds | PC, Quest, Android | Left stick, drag look, edge-tap turn [S/B] | Quick Menu; FOV and sensitivity settings [S] | Unlimited custom; perf ranks [S] | Voice, emotes, portals | Minimal | Avatar rank culling, sustained-perf mode, 100 MB cap [S] | Trust ranks, block | Stained-glass cathedral [S] | Heavy; 6 GB RAM; chaotic avatars |
| 5 | Rec Room | Mobile, console, VR | Touch HUD, "Reach" [S] | Watch menu [S] | Simple stylized | Voice, bubbles | Guided intro [B] | Low-poly style | Personal Space + Ignore Bubble [S] | Consistent style | Young, noisy crowd [B] |
| 6 | Roblox churches (TRC) | Mobile-majority [S] | Dynamic thumbstick, jump bottom-right, drag/pinch camera, auto-jump [S] | Top-left system buttons, emote wheel [B] | Platform avatar | Typed-chat worship, groups [S] | Manual, staff [S] | Engine-level | AI moderation, instance shutdown, bans [S] | Familiar to kids | Trolls; declining attendance [S] |
| 7 | Second Life Anglican Cathedral | Desktop; simplified mobile [S] | Keyboard | Dense viewer UI | Deep | Sit scripts in pews, text/voice liturgy [S] | Notecards [B] | n/a | Estate bans | Faithful Gothic build [S] | "Didn't feel like we were there"; decline [S] |
| 8 | Minecraft Catholic servers | Java/Bedrock | Bedrock touch | Game HUD | Skins | Roleplay liturgy, chat [S] | Rules sign | Voxel | Whitelists; DDoS risk [S] | Liturgical-colour beacon [S] | Roleplay vs sacrament confusion [S] |
| 9 | ZEPETO worlds | Mobile app | V-pad + jump + gesture [S/B] | Proximity interaction buttons [S] | Very deep, monetized | Emotes, selfies, voice | Tutorial worlds [S] | App-managed | Platform | Fashion, photos | Customization felt like a chore [S] |
| 10 | Gather | Web 2D; limited app | App: none. Browser: double-tap or hold-drag [S] | Bottom bar | 2D sprite | Proximity AV, private areas, quiet mode [S] | Short tutorial room [B] | 2D | Host tools | Spatial audio | No movement in app [S] |
| 11 | Vatican / Sistine / Notre-Dame tours | Web 360, LBE VR | Arrow node-hopping, rotate, zoom [S] | Minimal | None | None (or guided group) | Guided | Pre-rendered | n/a | Real art at full detail | Solitary; weak audio; tech hiccups [S] |
| 12 | Sky: CotL | Mobile first | Touch, one/two-hand modes [B] | Near-empty screen [B] | Earned cosmetics | Candle-gated reveal, benches, hand-holding [S] | Wordless, led by others | Scalable quality [B] | Preventative friction [S] | Light, music, gestures | Grind; currency |
| 13 | Hallow | Mobile app (2D) | n/a | Tabs | none | Intentions, groups, challenges [S] | Guided | n/a | Group admin | Audio quality | No co-presence |

---

## 3. (b) Top 10 UX patterns for mobile 3D social rooms

1. **Floating (dynamic) left thumbstick.** The stick appears where the thumb lands in the lower-left half, so the user never has to find a fixed centre; a fixed stick causes drift and misses [S: Roblox docs; Unity forum]. Add a dead zone, clamp the knob, and use a walk-only speed in a cathedral. Offer left-handed mirroring: one accessibility study found four control layouts each chosen by about 25% of players, so no layout suits everyone [S: gameaccessibilityguidelines.com].
   Sources: https://create.roblox.com/docs/reference/engine/enums/DevTouchMovementMode.md · https://discussions.unity.com/t/opinions-wanted-why-are-joystick-controls-so-terrible-on-mobile/640042 · https://gameaccessibilityguidelines.com/?p=1119

2. **Right-half drag to orbit, pinch to zoom, auto-follow behind the avatar.** This is the Roblox convention users already know [S]. Lock into "drag" once movement passes a small threshold so drags are never misread as taps; clamp and smooth zoom [S: cursa.app]. Third person is the right default: seeing the avatar foreshadows camera motion, which reduces discomfort [S: VR guidelines].
   Sources: https://create.roblox.com/docs/scripting/input/mobile-input · https://cursa.app/en/page/touch-controls-for-mobile-games-input-patterns-and-feedback · https://arxiv.org/pdf/2207.06346

3. **Tap-to-move as a second locomotion mode.** Gather's mobile browser uses double-tap on a destination [S]; Vatican tours use arrow hotspots [S]. In a cathedral, tapping a pew, the candle rack or the altar rail should walk the avatar there and trigger the action. This doubles as the one-handed, accessibility and low-dexterity mode [I].
   Sources: https://support.gather.town/articles/7619450362-gather-1-0-on-mobile-browsers · https://www.openculture.com/2025/05/take-a-3d-virtual-tour-of-the-sistine-chapel.html

4. **One contextual action button, driven by proximity.** ZEPETO teaches "interaction buttons that appear when the user approaches something" [S]; Roblox has proximity prompts [B]. Show a single large button near the right thumb whose label changes: Sit, Kneel, Light a candle, Take holy water. No jump button is needed in a church; give that slot to the action button [I].
   Source: https://naverz-group.readme.io/studio/lang-id/reference/tutorial_overview

5. **Seat as a state, not a physics event.** Second Life puts the sit script in the pew with a fixed position and rotation, several slots per pew, and suffers from avatars being flung on stand-up [S]. So: snap to a named slot, play a short ease-in, switch the camera to a calmer seated framing facing the altar, replace the joystick with Stand / Kneel / Pray, and on stand-up place the avatar at a pre-authored aisle point [I].
   Source: https://forums-archive.secondlife.com/54/c3/351288/1.html

6. **Near-empty HUD that fades.** Sky and Sansa keep the screen almost bare [B/S]; Rec Room hides the HUD when not needed and keeps everything behind one Watch menu [S]. Use four corners at most: menu top-left, presence count top-right, joystick bottom-left, action bottom-right. Fade controls to low opacity after a few seconds of stillness, and remove them entirely when seated [I].
   Sources: https://recroom.com/ship-notes/2020/8/31/rec-room-update-the-ambidextrous-edition · https://rec-room.fandom.com/wiki/Watch_Menu

7. **Ritual gestures instead of a generic emote wheel.** Sansa's whole vocabulary is palms-together, bow, kneel, beads, moktak, and users ask for more rituals, not chat [S]. Offer a small radial of 5-6 gestures: sign of the cross, bow, genuflect, kneel, fold hands, offer peace. Greeting a stranger with a bow is safe, wordless and on-theme [I].
   Sources: https://www.koreaherald.com/article/10921693 · https://www.koreatimes.co.kr/southkorea/20261103/ai-built-virtual-buddhist-temple-draws-1-mil-visitors-in-less-than-a-week

8. **Thirty-second, wordless onboarding with a usable default avatar.** Sansa drops everyone in as the same figure with a random gentle name and it reached a million visits [S]; a user abandoned Zepeto because customization came first [S]; Horizon was criticized for throwing newcomers into live voice with strangers [S]. Sequence: appear in the narthex, a ghost thumb shows "drag to walk", a light leads to the font, then to a pew, then the first prayer. Customization is offered later as a reward [I].
   Sources: https://www.seoul.co.kr/news/newsView.php?id=20261105032003 · https://about.fb.com/news/2022/02/personal-boundary-horizon/

9. **Quality tiers and avatar culling for heat and battery.** VRChat ranks avatars, lets users hide heavy ones, restricts mobile shaders, caps world size and offers a sustained-performance mode aimed at heat [S]. For three.js, community guidance is: cap device pixel ratio (around 1.5), keep draw calls low (roughly under 100) via instancing and merged static geometry, no real-time shadows or antialiasing on low tier, half-resolution bloom if any, LOD, and render on demand when nothing moves [S, community sources; verify with `renderer.info` on a real device]. In a WebView also: pause the loop on `visibilitychange`, drop to 30 fps when seated, bake lighting, and show distant avatars as impostors or candle-like points [I].
   Sources: https://creators.vrchat.com/avatars/avatar-performance-ranking-system/ · https://docs.vrchat.com/docs/vrchat-202332m · https://discourse.threejs.org/t/restricting-viewport-size-for-mobile/7270 · https://www.hontran.dev/blog/three-js-performance-optimization · https://jvinhit.github.io/blog/threejs-08-performance-and-instancing/

10. **Safety by design, and a non-3D fallback.** Sky gates all contact behind mutual consent and confines chat to benches [S]; Horizon needed a personal boundary and voice garbling after the fact [S]; Rec Room separates Personal Space from Ignore Bubble [S]; Sansa simply has no chat [S]. Default to no free text: gestures, preset phrases and curated intentions. Provide a "simple mode" that skips 3D walking (pick a seat from a floor plan, then a fixed seated view) for old phones, screen-reader users and people prone to motion discomfort [I].
    Sources: https://mobilegamer.biz/jenova-chen-explains-why-theres-no-teabagging-in-sky-children-of-the-light/ · https://www.engadget.com/meta-horizon-worlds-personal-boundary-update-182754958.html

Accessibility checklist [I, with the head-bob item sourced to Xbox guidelines via https://arxiv.org/pdf/2207.06346]: reduce-motion toggle (no head bob, no camera sway, cut instead of fly transitions); adjustable look sensitivity and FOV as VRChat mobile offers [S]; left-handed layout; captions for bells and spoken prayers; large-text mode; haptic tick on each bead; everything reachable without the joystick.

---

## 4. (c) Pitfalls

| Pitfall | Evidence | Fix |
|---|---|---|
| **Motion discomfort** | VR research: abrupt, unexpected camera motion and bobbing cause discomfort; duration of acceleration matters; a visible avatar helps anticipation; FOV changes can themselves disturb [S]. No phone-specific data found. | Third-person default; constant slow walk speed; smoothed camera with no auto-swing on collision; no head bob; fade-to-black for sit/teleport; fixed seated camera; user-adjustable sensitivity and FOV. https://arxiv.org/pdf/2207.06346 · https://arxiv.org/pdf/1611.06292 |
| **Small tap targets in a 3D scene** | Candles, beads and pews are tiny on screen; fixed sticks get missed [S: Unity forum]. | Never require tapping the 3D object itself. Use the proximity action button, generous invisible hit volumes, and snap-to-nearest. Platform guidance is roughly 48 dp minimum [B]. |
| **HUD clutter** | Virtual sticks and buttons obstruct the scene [S: Develop conference talk]. | Four-corner rule, auto-fade, one menu, hide all when seated. https://www.mcvuk.com/business-news/media-pr/virtual-controllers-should-not-obstruct-touch-gameplay/ |
| **Loneliness in empty rooms** | Christian Post: 10 people in a megachurch auditorium, alone at another, rows of unused rooms [S]. SL cathedral attendance declined [S]. | See the list below. |
| **Scale mismatch** | Unused rooms read as abandonment [S]. | Start with a small chapel; open the nave only when occupancy warrants; one room, not many [I]. |
| **Audio bleed and competing sound** | Sermon audible outside; weak sound in Eternal Notre-Dame [S]. | Zoned audio; ambient bed (footsteps, distant organ, candle crackle); per-user volume. |
| **Trolls and harassment** | Horizon groping reports; Roblox filter evasion; Vatican Minecraft DDoS [S]. | No free text by default; no avatar collision or a personal boundary; fixed solemn gesture set; rate limits; report and mute; server-side validation. |
| **Customization as a burden** | Zepeto user quit in two days [S]. | Good default, optional later. |
| **Irreverent avatars** | "Pick any avatar" at VR baptisms [S]. | Curated wardrobe: veils, scapulars, liturgical colours, no free upload. |
| **Sacramental confusion** | Pro Deo MC disclaimer; Anglican and Catholic caution against virtual sacraments [S]. | Devotions only (rosary, Angelus, Liturgy of the Hours, candles, adoration-style silence). State plainly this is not Mass or confession, and point to real parishes, as St Peter's twin links to real visits [S]. |
| **Launch-day overload** | Sansa's limit was 20 concurrent users on day one [S]. | Instance the room into shards of 20-40; cheap position sync at low tick rate; queue or overflow chapel. |
| **Low social pressure, drive-by visits** | "Social pressure is almost non-existent" [S]. | Embrace short visits (Sansa users "sit a while and leave" [S]); make a two-minute visit feel complete. |

**Fixing the empty room** [I, grounded in the sources noted]:

1. **Traces of past visitors.** Candles stay lit for hours with a count ("312 candles lit today"); worn kneelers; an intentions book. The room shows it was prayed in even when nobody is present.
2. **Asynchronous presence.** Faint "echo" figures of people who prayed in the last hour, clearly marked as past, never as live users. Do not fake live humans.
3. **Aggregate presence across shards.** "47 people are praying the rosary now" (the Hallow-style community signal [S]) even if only six are rendered.
4. **Small rooms first.** A side chapel for eight feels full with three.
5. **Scheduled convergence.** Angelus bells at 06:00, 12:00, 18:00 as Chanmi does [S], plus a nightly rosary time, so people arrive together.
6. **The building as companion.** Time-of-day light through stained glass, organ, incense haze, bells: the VRChat "stained-glass light" cathedral and SL's faithful Gothic build are what visitors remembered [S].
7. **Frame solitude as valid.** "Alone yet together" is the stated appeal [S]; an empty chapel with one lit sanctuary lamp is a real Catholic experience, not a failure state.

---

## 5. (d) Opportunities specific to a Catholic prayer setting

1. **Liturgical clock.** Tie lighting and sound to the user's local time: dawn light for Lauds, noon Angelus, golden Vespers, candle-only Compline. Chanmi already rings the Angelus at 06:00/12:00/18:00 [S]; in Eastertide switch to the Regina Caeli [I].
2. **Liturgical calendar as visual state.** The Vatican Minecraft beacon changes to the season's colour [S]. Change altar frontal, banners and avatar accents: violet in Advent and Lent, white for Christmas and Easter, red for Pentecost and martyrs, green in Ordinary Time, rose on Gaudete and Laetare; bare altar on Good Friday; Paschal candle in Easter [I].
3. **Shared rosary rhythm.** One bead-tap per prayer, synchronized across the room: a shared pulse of light along a giant rosary or along the pews, haptic tick per bead, call-and-response halves (leader side / response side by pew), mysteries chosen by weekday. Sansa's bead-turning and 108 bows show that a simple repeated tap is satisfying on a phone [S]. Late joiners fall into the current decade [I].
4. **Silence mode.** Sansa proves no-chat can be the feature: "a quiet place to rest without having to speak" [S]. Offer a silence toggle or a silent chapel: no names, no gestures from others, HUD hidden, only ambient sound and a subtle count. Pair it with an adoration-style focal point [I].
5. **Votive candles as the persistent social object.** Present in Chanmi [S]. Light a candle with an optional intention (private, or shared from a moderated or preset list); it burns for a real duration; others can "pray for this intention" with one tap, which notifies the owner, mirroring Hallow's intention notifications [S].
6. **Gesture grammar from the liturgy.** Holy water at the door, genuflect on entering a pew, kneel/sit/stand, sign of the cross, sign of peace as the only stranger-to-stranger gesture, mirroring Sansa's hapjang greeting [S].
7. **Stations and micro-pilgrimage.** Users asked Sansa for tapdori (circling the pagoda) [S]. Catholic equivalents: Stations of the Cross around the aisles in Lent, a May crowning, a Jubilee-style holy door, a walk to a Marian side chapel. Node-hopping in the style of the Vatican tours makes this easy on low-end phones [S/I].
8. **Familiar architecture, Korean and universal.** The SL cathedral's lesson is that conformity to known forms makes it read as church [S]; Inpis lets users choose Notre-Dame or Sagrada Familia [S]. Consider a Myeongdong-style Gothic default with selectable or seasonal venues [I].
9. **Honest framing and a bridge to the parish.** Follow Pro Deo MC's disclaimer and the St Peter's twin's link to physical visits [S]: devotion here, sacraments at your parish; surface nearby Mass times [I].
10. **Short-visit completeness.** A "one decade", "one candle" or "three Hail Marys" visit of under two minutes with a quiet closing (bell, blessing text), matching the observed "sit a while and leave" behaviour [S]. Streaks should be gentle (a lit lamp, not a leaderboard) [I].
11. **Reach the homebound.** VR Church's most convincing users were the homebound, the ill and the socially anxious [S]. Large-text, one-handed, tap-to-move and audio-led modes serve elderly Catholics directly [I].

---

## 6. Recommended default for the cyber cathedral (summary of the above, all [I])

- Landscape or portrait both supported; floating joystick bottom-left; drag-look on the right; one contextual action button bottom-right; menu top-left; presence count top-right; all fading when idle.
- Tap any pew, candle rack or station to auto-walk and act.
- Seated mode: fixed camera toward the altar, joystick replaced by Kneel / Pray rosary / Stand.
- Six liturgical gestures; no free-text chat at launch; candle intentions from presets or moderated text.
- Default robed avatar with random gentle name; wardrobe unlocked later.
- Three quality tiers plus a non-3D "simple mode"; 30 fps and render-on-demand when seated; shards of 20-40.
- Bells on the local hour, liturgical colours by date, candle traces for empty hours.

## 7. Source list

Korean sanctuaries
- https://www.koreaherald.com/article/10921693
- https://asianews.network/?p=311927
- https://www.koreatimes.co.kr/southkorea/20261103/ai-built-virtual-buddhist-temple-draws-1-mil-visitors-in-less-than-a-week
- https://www.seoul.co.kr/news/newsView.php?id=20261105032003
- https://blog.ai.dmomo.co.kr/news/37037
- https://www.chinadailyhk.com/article/642184

VR / metaverse churches
- https://wordandway.org/2022/02/01/faith-in-the-metaverse-a-vr-quest-for-community-fellowship/
- https://fortune.com/2022/01/31/virtual-worshipping-services-religion-metaverse/
- https://eteknix.com/christian-pastor-conducts-digital-baptisms-in-virtual-reality
- https://ryanschultz.com/2017/10/21/religion-spirituality-and-virtual-reality/
- https://www.christianpost.com/news/i-went-to-church-in-the-metaverse-and-this-is-what-i-found.html
- https://julieroys.com/life-church-multi-site-megachurch-virtual-reality
- https://about.fb.com/news/2022/02/personal-boundary-horizon/
- https://www.engadget.com/meta-horizon-worlds-personal-boundary-update-182754958.html
- https://www.faithwire.com/2022/02/02/dangers-in-cyberspace-woman-says-she-was-virtually-gang-raped-in-facebooks-metaverse

Platforms and controls
- https://help.vrchat.com/hc/en-us/articles/19659443577491-VRChat-Mobile-Controls (403 on fetch; search snippet used)
- https://wiki.vrchat.com/wiki/Controls
- https://creators.vrchat.com/avatars/avatar-performance-ranking-system/
- https://creators.vrchat.com/platforms/android/quest-content-optimization
- https://docs.vrchat.com/docs/vrchat-202332m
- https://recroom.com/ship-notes/2020/8/31/rec-room-update-the-ambidextrous-edition
- https://recroom.com/ship-notes/2020/12/14/rec-room-update-the-reaching-and-waving-edition
- https://blog.recroom.com/posts/2022/5/26/updating-our-screens-controls
- https://rec-room.fandom.com/wiki/Watch_Menu
- https://create.roblox.com/docs/scripting/input/mobile-input
- https://create.roblox.com/docs/reference/engine/enums/DevTouchMovementMode.md
- https://devforum.roblox.com/t/a-renewed-vision-the-robloxian-christians/2007251
- https://devforum.roblox.com/t/the-robloxian-christians-manual/190757
- https://about.roblox.com/newsroom/2026/03/safety-snapshot-march
- https://arxiv.org/abs/2605.04491
- https://naverz-group.readme.io/studio-world/docs/vpad_customize
- https://naverz-group.readme.io/studio/lang-id/reference/tutorial_overview
- https://naverz-group.readme.io/studio/docs/world_guidelines
- https://support.gather.town/articles/7619450362-gather-1-0-on-mobile-browsers
- https://support.gather.town/hc/en-us/articles/17580563233684
- https://support.gather.town/hc/en-us/articles/15909782743444
- https://gathertown.canny.io/changelog/updates-for-september-27-2021

Second Life, Minecraft
- https://heiup.uni-heidelberg.de/journals/religions/article/view/9385 (503 on fetch; title and search snippet used)
- https://anglicannews.org/news/2012/04/students-experience-online-worship-for-the-first-time.aspx
- https://www.christiantoday.com/news/what-happened-to-online-churches
- https://forums-archive.secondlife.com/54/c3/351288/1.html
- https://feedback.secondlife.com/mobile-public-beta-features
- https://www.pcgamer.com/the-vatican-has-its-own-minecraft-server
- https://www.insights.uca.org.au/vatican-gets-minecraft-server/
- https://medium.com/catholicism-for-the-modern-world/catholicism-and-gaming-minecraft-as-a-medium-for-evangelization-db32fe97c2b
- https://religionnews.com/?p=2888565

Tours and pilgrimage
- https://www.vaticannews.va/en/vatican-city/news/2024-11/ai-technology-st-peters-basilica-digital-experience-microsoft.print.html
- https://petapixel.com/2024/11/14/vatican-used-400000-photos-to-create-digital-twin-of-st-peters-basilica
- https://www.openculture.com/2025/05/take-a-3d-virtual-tour-of-the-sistine-chapel.html
- https://googlemapsmania.blogspot.com/2020/04/the-sistine-chapel-virtual-tour.html
- https://www.ccsinsight.com/blog/hope-springs-eternal/
- https://www.funbooker.com/en/listing/ticket-for-the-eternal-notre-dame-immersive-experience-in-paris-1/show?reviewSort=recent

Social design, prayer apps, reading rooms
- https://www.pcgamer.com/games/mmo/nobody-is-born-toxic-says-journeys-creative-director-while-preparing-to-launch-the-kindest-mmo-on-pc
- https://mobilegamer.biz/jenova-chen-explains-why-theres-no-teabagging-in-sky-children-of-the-light/
- https://gamedeveloper.com/design/using-emotion-to-drive-social-play-in-i-sky-children-of-the-light-i-
- https://intercom.help/hallow-inc/en/articles/10618520-how-to-share-prayer-requests-and-pray-for-intentions-in-hallow
- https://aleteia.org/2020/04/22/popular-catholic-meditation-app-makes-it-easy-to-pray-with-others
- https://www.inqld.com.au/news/2021/11/26/good-lord-brisbanes-catholics-the-first-to-have-church-without-a-church
- https://maily.so/semoram/posts/2qzpyqqyz4x
- https://brunch.co.kr/@wybook/1381

Controls, performance, comfort
- https://discussions.unity.com/t/opinions-wanted-why-are-joystick-controls-so-terrible-on-mobile/640042
- https://cursa.app/en/page/touch-controls-for-mobile-games-input-patterns-and-feedback
- https://gameaccessibilityguidelines.com/?p=1119
- https://www.mcvuk.com/business-news/media-pr/virtual-controllers-should-not-obstruct-touch-gameplay/
- https://discourse.threejs.org/t/restricting-viewport-size-for-mobile/7270
- https://www.hontran.dev/blog/three-js-performance-optimization
- https://jvinhit.github.io/blog/threejs-08-performance-and-instancing/
- https://arxiv.org/pdf/2207.06346
- https://arxiv.org/pdf/1611.06292
