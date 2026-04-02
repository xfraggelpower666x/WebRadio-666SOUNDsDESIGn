-- 666SOUNDsDESIGn source database schema
-- Static GitHub Pages build uses IndexedDB in-browser.
-- This SQL file is included for optional backend persistence (SQLite / D1 / Postgres compatible with small changes).

CREATE TABLE IF NOT EXISTS audio_sources (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  type TEXT NOT NULL,            -- radio, stream, soundcloud, mixcloud, youtube, external
  source_group TEXT NOT NULL DEFAULT 'custom',
  url TEXT NOT NULL,
  meta_url TEXT DEFAULT '',
  artwork_url TEXT DEFAULT '',
  active_source TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR REPLACE INTO audio_sources
(id,label,type,source_group,url,meta_url,artwork_url,active_source,sort_order,is_enabled)
VALUES
('main-radio','Main Radio','radio','radio','https://666soundsdesign.fraggelpower666.workers.dev/stream','https://666soundsdesign.fraggelpower666.workers.dev/status','assets/logo/logo-primary.jpg','main',1,1),
('sunshine-live','Sunshine Live','radio','radio','https://666soundsdesign.fraggelpower666.workers.dev/stream-sunshine','','assets/logo/logo-primary.jpg','sunshine',2,1),
('sunshine-techhouse','Sunshine Techhouse','radio','radio','https://666soundsdesign.fraggelpower666.workers.dev/stream-sunshine-techhouse','','assets/logo/logo-primary.jpg','sunshine-techhouse',3,1),
('github-intro','GitHub Intro MP3','stream','intro','assets/audio/WebRadio_666SOUNDsDESIGn_Intro.mp3','','assets/logo/logo-primary.jpg','intro',4,1),
('soundcloud-profile','SoundCloud','soundcloud','social','https://soundcloud.com/fraggelpower666','','assets/logo/logo-primary.jpg','soundcloud',5,1),
('mixcloud-profile','Mixcloud','mixcloud','social','https://www.mixcloud.com/Fraggelpower666/','','assets/logo/logo-primary.jpg','mixcloud',6,1),
('youtube-music','YouTube Music','youtube','social','https://music.youtube.com/@fraggelpower666','','assets/logo/logo-primary.jpg','youtube',7,1);
