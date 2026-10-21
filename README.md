<div align="center">

<h3> Blue Archive 3D Model Viewer // Kivotos Archive </h3>

</div>


<div align="center">
  <img src="https://files.catbox.moe/ov3gsg.jpg" style="max-width: 70%; height: auto;"/>
</div>

# https://github.com/noname0310/babylon-mmd/

Interactive 3D character model viewer for **Blue Archive** featuring **289 models across 144 students** from Kivotos, built with Babylon.js and native web standards as a fan hobby project.

## Build Settings

- Vanilla JavaScript (ES6+) & Modern HTML5 / CSS3
- Babylon.js 7.x (WebGL 2.0 Engine & glTF 2.0 loader)
- Native Windows PowerShell HTTP Server (.NET HttpListener)
- Zero external package dependencies (no Node.js/npm or Python install required)

## Details

- Run it simply by double-clicking `run.bat` (inside `ba-model-viewer/`) or `run-ba-viewer.bat` (in root directory)
- Native lightweight web server automatically handles CORS headers and MIME types (`.glb`, `.gltf`, `.webp`, `.mp3`, `.wav`)
- Automatically opens in default browser at `http://localhost:8080/index.html`
- All main 3D engine and interaction logic is written in `app.js` and styled in `style.css`

## Route & Character Handling
`http://localhost:8080/index.html?character=charactername`

- *charactername* is the name of the target student.
- *charactername* is case-insensitive. Periods and whitespaces in names are removed.
- Direct instant selection via 3-bar menu button (`☰`) or keyboard shortcut `M`.
- Fast switching between costume variants via Alter button or hotkey `C` / `A`.

Example route handling for characters across Kivotos Academies:

### Millennium Science School

| Character | *charactername* | Variants |
|-----------|-----------------|----------|
| Yuuka | yuuka | Default, Pajama, Sportswear |
| Arisu | arisu | Default, Maid, Battle, Battle Scenario, Battle Carrier |
| Asuna | asuna | Default, Bunny Girl, School Uniform |
| Karin | karin | Default, Bunny Girl, School Uniform |
| Toki | toki | Default, Bunny Girl, Battle, Battle Scenario, Cafe |
| Neru | neru | Default, Bunny Girl, School Uniform |
| Himari | himari | Default, Battle |
| Rio | rio | Default, Battle, Battle Scenario |
| Noa | noa | Default, Pajama |
| Koyuki | koyuki | Default, Pajama |
| Midori | midori | Default, Maid, Battle |
| Momoi | momoi | Default, Maid, Battle |
| Yuzu | yuzu | Default, Maid, Battle, Battle Carrier, Battle Cut-in |
| Kei | kei | Default, Prototype, Scenario 1, Scenario 2, Carrier, Carrier 2 |
| Chihiro | chihiro | Default |
| Kotama | kotama | Default, Camping |
| Hare | hare | Default, Camping |
| Maki | maki | Default, Camping |
| Kotori | kotori | Default, Cheerleader |
| Utaha | utaha | Default, Cheerleader |
| Hibiki | hibiki | Default, Cheerleader |
| Eimi | eimi | Default, Swimsuit, Battle, Battle Scenario, Battle Carrier |
| Sumire | sumire | Default, Part-Timer |
| Rei | rei | Default |

### Trinity General School

| Character | *charactername* | Variants |
|-----------|-----------------|----------|
| Mika | mika | Default, Swimsuit, Cut-in |
| Hifumi | hifumi | Default, Swimsuit |
| Azusa | azusa | Default, Swimsuit |
| Koharu | koharu | Default, Swimsuit |
| Hanako | hanako | Default, Swimsuit |
| Nagisa | nagisa | Default, Swimsuit |
| Ui | ui | Default, Swimsuit |
| Mine | mine | Default, Idol |
| Sakurako | sakurako | Default, Idol |
| Mari | mari | Default, Sportswear, Idol |
| Hasumi | hasumi | Default, Sportswear, Swimsuit |
| Tsurugi | tsurugi | Default, Swimsuit |
| Kazusa | kazusa | Default, Band |
| Airi | airi | Default, Band |
| Natsu | natsu | Default, Band, Band No Weapon |
| Yoshimi | yoshimi | Default, Band |
| Reisa | reisa | Default, Magical, Magical Special |
| Suzumi | suzumi | Default, Magical |
| Hinata | hinata | Default, Swimsuit |
| Ichika | ichika | Default, Swimsuit |
| Seia | seia | Default, Swimsuit |
| Serina | serina | Default, Christmas |
| Hanae | hanae | Default, Christmas |
| Mashiro | mashiro | Default, Swimsuit |
| Shimiko | shimiko | Default |

### Gehenna Academy

| Character | *charactername* | Variants |
|-----------|-----------------|----------|
| Hina | hina | Default, Swimsuit, Dress |
| Aru | aru | Default, New Year, Dress |
| Kayoko | kayoko | Default, New Year, Dress |
| Mutsuki | mutsuki | Default, New Year, Dress |
| Haruka | haruka | Default, New Year, Dress |
| Iori | iori | Default, Swimsuit |
| Ako | ako | Default, Dress |
| Haruna | haruna | Default, New Year, Sportswear |
| Fuuka | fuuka | Default, New Year |
| Junko | junko | Default, New Year |
| Akari | akari | Default, New Year |
| Izumi | izumi | Default, Swimsuit, New Year |
| Chinatsu | chinatsu | Default, Hot Spring |
| Iroha | iroha | Default |
| Ibuki | ibuki | Default |
| Kasumi | kasumi | Default |
| Makoto | makoto | Default |
| Satsuki | satsuki | Default |
| Erika | erika | Default |
| Kirara | kirara | Default |
| Sena | sena | Default, Casual |
| Megu | megu | Default |
| Juri | juri | Default, Part-Timer |

### Abydos High School

| Character | *charactername* | Variants |
|-----------|-----------------|----------|
| Shiroko | shiroko | Default, Riding, Swimsuit |
| Shiroko＊Terror | shirokoterror | Terror |
| Hoshino | hoshino | Default, Swimsuit, Battle |
| Nonomi | nonomi | Default, Swimsuit |
| Serika | serika | Default, New Year, Swimsuit |
| Ayane | ayane | Default, Swimsuit |

### Hyakkiyako Alliance Academy

| Character | *charactername* | Variants |
|-----------|-----------------|----------|
| Izuna | izuna | Default, Swimsuit |
| Chise | chise | Default, Swimsuit |
| Wakamo | wakamo | Default, Swimsuit |
| Kikyou | kikyou | Default, Swimsuit, Swimsuit Special |
| Tsukuyo | tsukuyo | Default, Dress |
| Michiru | michiru | Default, Dress |
| Renge | renge | Default, Swimsuit |
| Yukari | yukari | Default, Swimsuit |
| Nagusa | nagusa | Default, Swimsuit, Cut-in |
| Mimori | mimori | Default, Swimsuit |
| Shizuko | shizuko | Default, Swimsuit |
| Tsubaki | tsubaki | Default, Guide |
| Pina | pina | Default, Guide |
| Kaho | kaho | Default |
| Kaede | kaede | Default |
| Umika | umika | Default |
| Niya | niya | Default |

### SRT Special Academy & Arius Branch

| Character | *charactername* | Variants |
|-----------|-----------------|----------|
| Miyako | miyako | Default, Swimsuit |
| Saki | saki | Default, Swimsuit |
| Miyu | miyu | Default, Swimsuit |
| Moe | moe | Default, Swimsuit |
| Otogi | otogi | Default |
| Kurumi | kurumi | Default |
| Niko | niko | Default |
| Saori | saori | Default, Swimsuit, Dress, Dress Cafe |
| Atsuko | atsuko | Default, Swimsuit |
| Misaki | misaki | Default, Swimsuit |
| Hiyori | hiyori | Default, Swimsuit |

### Red Winter, Shanhaijing, Highlander, Valkyrie & Others

| Character | *charactername* | Variants |
|-----------|-----------------|----------|
| Cherino | cherino | Default, Hot Spring |
| Marina | marina | Default, Qipao |
| Tomoe | tomoe | Default, Qipao |
| Shigure | shigure | Default, Hot Spring |
| Nodoka | nodoka | Default, Hot Spring |
| Meru | meru | Default |
| Momiji | momiji | Default |
| Minori | minori | Default |
| Takane | takane | Default |
| Yakumo | yakumo | Default |
| Kisaki | kisaki | Default, Swimsuit |
| Shun | shun | Default, Kid, Swimsuit 1, Swimsuit 2 |
| Kokona | kokona | Default |
| Rumi | rumi | Default |
| Mina | mina | Default |
| Reijo | reijo | Default |
| Saya | saya | Default, Casual |
| Hikari | hikari | Default |
| Nozomi | nozomi | Default |
| Chiaki | chiaki | Default |
| Aoba | aoba | Default |
| Kanna | kanna | Default, Swimsuit |
| Fubuki | fubuki | Default, Swimsuit |
| Kirino | kirino | Default, Swimsuit |
| Konoka | konoka | Default |
| Hatsune Miku | hatsunemiku | Collab |
| Misaka Mikoto | misakamikoto | Collab |
| Shokuhou Misaki | shokuhoumisaki | Collab |
| Saten Ruiko | satenruiko | Collab |

## Controls & Keybindings

| Input | Action |
|:---:|---|
| **Left Click Drag** | 360° Free Orbit Rotation |
| **Right / Middle Drag** | Pan Camera (Up/Down/Left/Right) |
| **Mouse Wheel** | Smooth Zoom In / Out |
| **M** | Open Student Roster Modal (3-bar menu) |
| **C** / **A** | Cycle Next Costume Variant (Alter) |
| **Space** | Play / Pause Motion Animation |
| **T** | Toggle 360° Turntable Mode |
| **R** | Reset Camera to Default Front View |
| **D** | Toggle Kivotos Dark / Light Mode |
| **1 - 4** | Switch Stage Backdrop (Podium / Studio / Cyber Grid / Clear) |
| **Esc** | Close any active popup modal |

## Support & Buy Me a Coffee

Nếu bạn yêu thích dự án và muốn ủng hộ một tách cà phê cho tác giả:

- **Chủ tài khoản:** VO ANH DUC
- **Số tài khoản:** 1828517809
- **Ngân hàng:** Vietcombank
- Hoặc bấm vào nút **☕ Support / Buy Me a Coffee** góc trên bên phải màn hình để quét mã QR!

Chân thành cảm ơn sự đồng hành và ủng hộ của bạn! ❤️
