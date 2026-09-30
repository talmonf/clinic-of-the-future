-- 001: Initial schema for the planning OS
-- Idempotent: safe to re-run. Existing rows are left unchanged (ON CONFLICT DO NOTHING).
-- BEFORE RUNNING: replace the two placeholder emails in the users insert at the bottom
-- with the founders' Google accounts, in lowercase.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE document_kind AS ENUM ('master', 'derivative');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE document_status AS ENUM ('draft', 'in_progress', 'pending_approval', 'approved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('open', 'done');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE contact_category AS ENUM (
    'partner', 'professional', 'other', 'referrer', 'investor', 'vendor', 'stakeholder'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE contact_source AS ENUM ('manual', 'inbound');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE contact_status AS ENUM ('new', 'in_conversation', 'active', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE appointment_kind AS ENUM ('advisor', 'site_visit', 'vendor', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ai_target_type AS ENUM ('document', 'meeting');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  image text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  kind document_kind NOT NULL,
  number integer,
  cluster text,
  title text NOT NULL,
  purpose text NOT NULL DEFAULT '',
  audience text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  key_question text NOT NULL DEFAULT '',
  sources text NOT NULL DEFAULT '',
  prior_documents text NOT NULL DEFAULT '',
  status document_status NOT NULL DEFAULT 'draft',
  decision_needed text NOT NULL DEFAULT '',
  next_action text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS documents_master_number_key
  ON documents (number)
  WHERE kind = 'master' AND number IS NOT NULL;

CREATE TABLE IF NOT EXISTS document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  version integer NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  status document_status NOT NULL,
  purpose text NOT NULL DEFAULT '',
  audience text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  key_question text NOT NULL DEFAULT '',
  sources text NOT NULL DEFAULT '',
  prior_documents text NOT NULL DEFAULT '',
  decision_needed text NOT NULL DEFAULT '',
  next_action text NOT NULL DEFAULT '',
  saved_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, version)
);

CREATE TABLE IF NOT EXISTS document_sources (
  document_id uuid NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  source_document_id uuid NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, source_document_id),
  CHECK (document_id <> source_document_id)
);

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  organization text NOT NULL DEFAULT '',
  category contact_category NOT NULL,
  source contact_source NOT NULL DEFAULT 'manual',
  contact_status contact_status NOT NULL DEFAULT 'new',
  contribution text NOT NULL DEFAULT '',
  mutual_value text NOT NULL DEFAULT '',
  next_action text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  starts_at timestamptz,
  document_id uuid REFERENCES documents (id) ON DELETE SET NULL,
  agenda text NOT NULL DEFAULT '',
  prep_questions text NOT NULL DEFAULT '',
  discussion text NOT NULL DEFAULT '',
  clarifications text NOT NULL DEFAULT '',
  gaps text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  starts_at timestamptz,
  ends_at timestamptz,
  kind appointment_kind NOT NULL DEFAULT 'other',
  with_whom text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  contact_id uuid REFERENCES contacts (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decided_on date,
  subject text NOT NULL,
  decision text NOT NULL,
  rationale text NOT NULL DEFAULT '',
  implication text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  meeting_id uuid REFERENCES meetings (id) ON DELETE SET NULL,
  document_id uuid REFERENCES documents (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement text NOT NULL,
  importance text NOT NULL DEFAULT '',
  certainty text NOT NULL DEFAULT '',
  how_to_test text NOT NULL DEFAULT '',
  finding text NOT NULL DEFAULT '',
  decision_text text NOT NULL DEFAULT '',
  document_id uuid REFERENCES documents (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk text NOT NULL,
  probability text NOT NULL DEFAULT '',
  impact text NOT NULL DEFAULT '',
  prevention text NOT NULL DEFAULT '',
  response text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  details text NOT NULL DEFAULT '',
  status task_status NOT NULL DEFAULT 'open',
  owner_name text NOT NULL DEFAULT '',
  due_on date,
  document_id uuid REFERENCES documents (id) ON DELETE SET NULL,
  meeting_id uuid REFERENCES meetings (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body text NOT NULL,
  document_id uuid REFERENCES documents (id) ON DELETE CASCADE,
  meeting_id uuid REFERENCES meetings (id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts (id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments (id) ON DELETE CASCADE,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notes_one_target CHECK (
    num_nonnulls(document_id, meeting_id, contact_id, appointment_id) = 1
  )
);

CREATE TABLE IF NOT EXISTS ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  purpose text NOT NULL DEFAULT '',
  system_prompt text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES ai_agents (id) ON DELETE CASCADE,
  actor_email text,
  target_type ai_target_type NOT NULL,
  target_id uuid NOT NULL,
  prompt_input text NOT NULL,
  output text NOT NULL,
  model text NOT NULL,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_runs_target_idx ON ai_runs (target_type, target_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_created_idx ON audit_events (created_at DESC);

-- Master documents. Bodies are outlines from the 29 Sep 2026 architecture, not settled venture content.

INSERT INTO documents (
  slug, kind, number, cluster, title, purpose, audience, owner_name, key_question,
  prior_documents, next_action, body, status, version
) VALUES
(
  '01-identity', 'master', 1, 'א', 'זהות המיזם',
  'הגדרה מוסכמת של זהות המיזם.',
  'המייסדים', 'המייסדים',
  'מי אנחנו ומה אנחנו מבקשים לבנות?',
  '',
  'לרשום מה כבר ידוע, מה חסר, ומה דורש החלטה.',
  $body$מתווה מתוך ארכיטקטורת המסמכים (29.9.2026). אין כאן תוכן מיזם מגובש.

כולל: שם והגדרת המיזם; מונחי יסוד משותפים; הרקע והרציונל להקמה; הצורך שממנו נולד הרעיון; מהות המרכז; מה המרכז אינו; תפיסת העולם; הכיוון ארוך הטווח.

תוצר: הגדרה מוסכמת של זהות המיזם.$body$,
  'draft', 1
),
(
  '02-founders', 'master', 2, 'א', 'זהות המייסדים והצוות המוביל',
  'תמונת צוות ההובלה.',
  'המייסדים', 'המייסדים',
  'מי מוביל את המיזם ומה כל אחד מהשותפים מביא אליו?',
  '01 — זהות המיזם',
  'לרשום מה כבר ידוע, מה חסר, ומה דורש החלטה.',
  $body$מתווה מתוך ארכיטקטורת המסמכים (29.9.2026). אין כאן תוכן מיזם מגובש.

כולל: פרופיל המייסדים; ניסיון ומומחיות; מוטיבציה; תפקידים ותחומי אחריות; השלמה בין השותפים; יכולות חסרות שיידרשו בהמשך.

תוצר: תמונת צוות ההובלה.$body$,
  'draft', 1
),
(
  '03-vision', 'master', 3, 'א', 'חזון, ייעוד, ערכים ועקרונות פעולה',
  'ה־DNA של המיזם.',
  'המייסדים', 'המייסדים',
  'איזה ארגון אנחנו רוצים לבנות?',
  '01 — זהות המיזם; 02 — זהות המייסדים',
  'לרשום מה כבר ידוע, מה חסר, ומה דורש החלטה.',
  $body$מתווה מתוך ארכיטקטורת המסמכים (29.9.2026). אין כאן תוכן מיזם מגובש.

כולל: חזון; ייעוד; ערכים; עקרונות מקצועיים; תפיסת השירות; תפיסת המטופל; רב־מקצועיות; איכות; חדשנות; אחריות; אתיקה.

תוצר: ה־DNA של המיזם.$body$,
  'draft', 1
),
(
  '04-model', 'master', 4, 'ב', 'מודל המרכז והשירות',
  'הגדרה מלאה של המוצר והשירות שהמרכז מציע. מאחד את המודל, סל השירותים ומסע המטופל.',
  'המייסדים', 'המייסדים',
  'מה המרכז נותן, למי וכיצד?',
  '01–03',
  'לרשום מה כבר ידוע, מה חסר, ומה דורש החלטה.',
  $body$מתווה מתוך ארכיטקטורת המסמכים (29.9.2026). אין כאן תוכן מיזם מגובש.

כולל: אוכלוסיות; שירותי Day 1 ושירותים עתידיים; מודל רב־מקצועי; מסע המטופל (פנייה, אינטייק, הערכה, התאמה, טיפול, מעקב, המשך או סיום או הפניה).

תוצר: הגדרה מלאה של המוצר והשירות שהמרכז מציע.$body$,
  'draft', 1
),
(
  '05-professional', 'master', 5, 'ב', 'מודל מקצועי, איכות ובטיחות',
  'מסגרת מקצועית מחייבת למרכז.',
  'המייסדים', 'המייסדים',
  'באילו עקרונות מקצועיים המרכז פועל וכיצד נשמרת איכות הטיפול?',
  '04 — מודל המרכז והשירות',
  'לרשום מה כבר ידוע, מה חסר, ומה דורש החלטה.',
  $body$מתווה מתוך ארכיטקטורת המסמכים (29.9.2026). אין כאן תוכן מיזם מגובש.

כולל: תפיסה מקצועית ומודל קליני; סטנדרטים; עבודה רב־מקצועית; הדרכה והתייעצות מקצועית; הערכת סיכון; מצבי חירום; תיעוד קליני; פרטיות וסודיות בטיפול; איכות; אירועים חריגים; ניהול סיכונים מקצועי.

תוצר: מסגרת מקצועית מחייבת למרכז.$body$,
  'draft', 1
),
(
  '06-value', 'master', 6, 'ב', 'הצעת הערך והבידול',
  'הגדרת הערך והבידול של המרכז. המסמך מבחין בין ערך אמיתי לבין מסר שיווקי.',
  'המייסדים', 'המייסדים',
  'איזה ערך המרכז מייצר ולמה המודל שלו רלוונטי?',
  '04 — מודל המרכז והשירות; 05 — מודל מקצועי, איכות ובטיחות',
  'לרשום מה כבר ידוע, מה חסר, ומה דורש החלטה.',
  $body$מתווה מתוך ארכיטקטורת המסמכים (29.9.2026). אין כאן תוכן מיזם מגובש.

כולל: בחינת הערך עבור מטופלים, משפחות, אנשי מקצוע, מטפלים, גורמי הפניה, ארגונים ושותפים.

תוצר: הגדרת הערך והבידול של המרכז.$body$,
  'draft', 1
),
(
  '07-market', 'master', 7, 'ג', 'שוק, צרכים, הזדמנויות והסביבה הקיימת',
  'תמונת השוק והסביבה. זהו מיפוי, לא מסמך דירוג מתחרים. מאחד את מיפוי השוק ומיפוי החלופות.',
  'המייסדים', 'המייסדים',
  'מה קורה בסביבה שבה אנו מבקשים לפעול?',
  '01–06',
  'לאחר שששת מסמכי הליבה.',
  $body$מתווה מתוך ארכיטקטורת המסמכים (29.9.2026). אין כאן תוכן מיזם מגובש.

כולל: אוכלוסיות; צרכים; מגמות; חסרים; חסמי נגישות; שירותים קיימים; מרכזים וקליניקות; מודלים חלופיים; מאפייני שירות; הזדמנויות; נקודות למידה.

תוצר: תמונת השוק והסביבה.$body$,
  'draft', 1
),
(
  '08-validation', 'master', 8, 'ג', 'מחקר וולידציה',
  'רשימת הנחות מתוקפות, הנחות הדורשות שינוי ופערי ידע. ההנחות מנוהלות ביומן ההנחות.',
  'המייסדים', 'המייסדים',
  'האם ההנחות שעליהן נשען המיזם מחזיקות במציאות?',
  '07 — שוק, צרכים והסביבה הקיימת',
  'כל הנחה עוברת: הנחה, שאלה, בדיקה, ממצא, מסקנה, החלטה.',
  $body$מתווה מתוך ארכיטקטורת המסמכים (29.9.2026). אין כאן תוכן מיזם מגובש.

מסלול: הנחה ← שאלה ← בדיקה ← ממצא ← מסקנה ← החלטה.
מקורות אפשריים: ראיונות; שאלונים; אנשי מקצוע; מנהלים; שותפים; משתמשים פוטנציאליים; מומחים; נתוני שוק.

תוצר: רשימת הנחות מתוקפות, הנחות הדורשות שינוי ופערי ידע.$body$,
  'draft', 1
),
(
  '09-business', 'master', 9, 'ג', 'מודל עסקי, פיננסי והיתכנות',
  'תמונה כלכלית אחת, עקבית ומבוססת הנחות. מאחד מודל עסקי, מודל פיננסי והיתכנות.',
  'המייסדים', 'המייסדים',
  'האם וכיצד המיזם יכול להתקיים מבחינה כלכלית?',
  '07 — שוק; 08 — מחקר וולידציה',
  'רק אחרי שנוצר בסיס במסמכים 01–08.',
  $body$מתווה מתוך ארכיטקטורת המסמכים (29.9.2026). אין כאן תוכן מיזם מגובש.

שלושה חלקים: מודל עסקי; מודל פיננסי; היתכנות (הנחות מרכזיות, רגישויות, פערים, תנאים להצלחה, נקודות החלטה).

תוצר: תמונה כלכלית אחת, עקבית ומבוססת הנחות.$body$,
  'draft', 1
),
(
  '10-governance', 'master', 10, 'ד', 'מבנה משפטי, רגולטורי, בעלות וממשל',
  'מסגרת משפטית וממשלית מוסכמת. המסמך הוא מסגרת עבודה; ההחלטות הסופיות ייבחנו עם עורך דין ורואה חשבון.',
  'המייסדים, עורך דין ורואה חשבון', 'המייסדים',
  'באיזו מסגרת המיזם יתקיים ומי מחזיק ומקבל החלטות?',
  '09 — מודל עסקי, פיננסי והיתכנות',
  'רק אחרי שנוצר בסיס במסמכים 01–09.',
  $body$מתווה מתוך ארכיטקטורת המסמכים (29.9.2026). אין כאן תוכן מיזם מגובש.

כולל: חברה, עמותה או חלופה אחרת; בעלות; זכויות המייסדים; שליטה; הכנסת שותפים; מנגנוני החלטה; ממשל; רישוי; רגולציה; עמידה בדרישות הפרטיות; ביטוח; אחריות משפטית; הסכמים.

תוצר: מסגרת משפטית וממשלית מוסכמת.$body$,
  'draft', 1
),
(
  '11-organization', 'master', 11, 'ד', 'מודל ארגוני, הנהלה וכוח אדם',
  'מודל ארגוני והוני־אנושי.',
  'המייסדים', 'המייסדים',
  'מי יפעיל את המרכז וכיצד תיראה המערכת הארגונית?',
  '09 — מודל עסקי; 10 — מבנה משפטי וממשל',
  'רק אחרי שנוצר בסיס במסמכים 01–10.',
  $body$מתווה מתוך ארכיטקטורת המסמכים (29.9.2026). אין כאן תוכן מיזם מגובש.

כולל: מבנה ארגוני; הנהלה; הנהלה מקצועית; צוות ליבה; אנשי מקצוע; יועצים; ספקים; תפקידים; סמכויות; מודלי העסקה; תגמול; גיוס; הכשרה; שימור.

תוצר: מודל ארגוני והוני־אנושי.$body$,
  'draft', 1
),
(
  '12-stakeholders', 'master', 12, 'ה', 'מפת שותפים ובעלי עניין',
  'מפת בעלי עניין חיה. פניות מהאתר נשמרות כאן.',
  'המייסדים', 'המייסדים',
  'עם מי נרצה ונצטרך לעבוד?',
  '04 — מודל המרכז; 06 — הצעת הערך',
  'רק אחרי שנוצר בסיס במסמכים 01–11.',
  $body$מתווה מתוך ארכיטקטורת המסמכים (29.9.2026). אין כאן תוכן מיזם מגובש.

כולל: שותפים מקצועיים ועסקיים; גופים מפנים; בעלי עניין; ספקים אסטרטגיים; משקיעים פוטנציאליים; תרומה אפשרית; ערך הדדי; סטטוס קשר; פעולה הבאה.

תוצר: מפת בעלי עניין חיה.$body$,
  'draft', 1
),
(
  '13-narrative', 'master', 13, 'ה', 'מסמך־על להצגת המיזם',
  'נרטיב אחיד של המיזם. ממנו נגזרות גרסאות ההצגה. הנגזרת אינה משנה את מסמך האב.',
  'המייסדים וקהלי ההצגה', 'המייסדים',
  'כיצד מספרים את סיפור המיזם בלי ליצור אמת נוספת?',
  '01–12',
  'רק אחרי שנוצר בסיס במסמכים 01–12.',
  $body$מתווה מתוך ארכיטקטורת המסמכים (29.9.2026). אין כאן תוכן מיזם מגובש.

כולל: הסיפור המלא של הצורך, המיזם, המודל, השירות, הערך, הבידול, השוק, הצוות, המודל העסקי, הסטטוס והדרך קדימה.
נגזרות: מסמך מנהלים; One Pager; Pitch Deck; Investor Deck; Partner Deck; מסמך מסרים.

תוצר: נרטיב אחיד של המיזם.$body$,
  'draft', 1
),
(
  '14-roadmap', 'master', 14, 'ה', 'Roadmap ותוכנית ההקמה',
  'תוכנית ביצוע אחת, המחברת אסטרטגיה לביצוע.',
  'המייסדים', 'המייסדים',
  'מה צריך לקרות, באיזה סדר ומי אחראי?',
  '01–13',
  'אחרון בסדר העבודה, אחרי חיבור לעולם החיצוני.',
  $body$מתווה מתוך ארכיטקטורת המסמכים (29.9.2026). אין כאן תוכן מיזם מגובש.

כולל: שלבי המיזם; אבני דרך; החלטות; תוצרים; תלויות; משימות; אחראי; שותפים; מועד; תוצר; KPI; סטטוס.

תוצר: תוכנית ביצוע אחת, המחברת אסטרטגיה לביצוע.$body$,
  'draft', 1
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO documents (
  slug, kind, cluster, title, purpose, audience, owner_name, key_question, body, status, version
) VALUES
(
  'deriv-one-pager', 'derivative', NULL, 'One Pager',
  'נגזרת ממסמך 13, ונשענת על 01, 04 ו־06. אינה משנה את מסמכי האב.',
  'גורמים חיצוניים', 'המייסדים', '',
  'טרם נגזר. אין לכתוב כאן טענות שאינן במסמכי המקור.', 'draft', 1
),
(
  'deriv-executive', 'derivative', NULL, 'מסמך מנהלים',
  'נגזרת ממסמך 13.',
  'הנהלה ושותפים', 'המייסדים', '',
  'טרם נגזר. אין לכתוב כאן טענות שאינן במסמכי המקור.', 'draft', 1
),
(
  'deriv-pitch', 'derivative', NULL, 'Pitch Deck',
  'נגזרת ממסמך 13 וממסמך 06.',
  'הצגה', 'המייסדים', '',
  'טרם נגזר. אין לכתוב כאן טענות שאינן במסמכי המקור.', 'draft', 1
),
(
  'deriv-investor', 'derivative', NULL, 'Investor Deck',
  'נגזרת ממסמך 13 וממסמך 09.',
  'משקיעים', 'המייסדים', '',
  'טרם נגזר. אין לכתוב כאן טענות שאינן במסמכי המקור.', 'draft', 1
),
(
  'deriv-partner', 'derivative', NULL, 'Partner Deck',
  'נגזרת ממסמך 13, ממסמך 06 וממסמך 12.',
  'שותפים', 'המייסדים', '',
  'טרם נגזר. אין לכתוב כאן טענות שאינן במסמכי המקור.', 'draft', 1
),
(
  'deriv-partnership-offer', 'derivative', NULL, 'הצעת שותפות',
  'נגזרת ממסמך 12, ממסמך 04 וממסמך 06.',
  'שותפים פוטנציאליים', 'המייסדים', '',
  'טרם נגזר. אין לכתוב כאן טענות שאינן במסמכי המקור.', 'draft', 1
),
(
  'deriv-investment-memo', 'derivative', NULL, 'מסמך השקעה',
  'נגזרת ממסמך 09, ממסמך 10 וממסמך 13.',
  'משקיעים', 'המייסדים', '',
  'טרם נגזר. אין לכתוב כאן טענות שאינן במסמכי המקור.', 'draft', 1
),
(
  'deriv-messaging', 'derivative', NULL, 'מסמך מסרים',
  'נגזרת ממסמכים 01, 03 ו־06.',
  'המייסדים', 'המייסדים', '',
  'טרם נגזר. אין לכתוב כאן טענות שאינן במסמכי המקור.', 'draft', 1
),
(
  'deriv-brand', 'derivative', NULL, 'זהות מותגית',
  'נגזרת ממסמכים 01, 03 ו־06.',
  'המייסדים', 'המייסדים', '',
  'טרם נגזר. אין לכתוב כאן טענות שאינן במסמכי המקור.', 'draft', 1
),
(
  'deriv-website', 'derivative', NULL, 'אתר',
  'האתר הציבורי נגזר ממסמכי היסוד 01–06 וממסמך 13. הטקסט באתר נכתב בנפרד ומסומן כמיזם בהקמה.',
  'הציבור', 'המייסדים', '',
  'העמוד הציבורי הוא הצהרת כיוון בלבד, כל עוד מסמכי האב בטיוטה.', 'draft', 1
),
(
  'deriv-marketing', 'derivative', NULL, 'חומרים שיווקיים',
  'נגזרת ממסמכים 01 ו־06 וממסמך המסרים.',
  'הציבור', 'המייסדים', '',
  'טרם נגזר. אין לכתוב כאן טענות שאינן במסמכי המקור.', 'draft', 1
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO document_sources (document_id, source_document_id)
SELECT d.id, s.id
FROM documents d
JOIN documents s ON s.slug IN ('13-narrative', '01-identity', '04-model', '06-value')
WHERE d.slug = 'deriv-one-pager'
ON CONFLICT DO NOTHING;

INSERT INTO document_sources (document_id, source_document_id)
SELECT d.id, s.id FROM documents d
JOIN documents s ON s.slug = '13-narrative'
WHERE d.slug = 'deriv-executive'
ON CONFLICT DO NOTHING;

INSERT INTO document_sources (document_id, source_document_id)
SELECT d.id, s.id FROM documents d
JOIN documents s ON s.slug IN ('13-narrative', '06-value')
WHERE d.slug = 'deriv-pitch'
ON CONFLICT DO NOTHING;

INSERT INTO document_sources (document_id, source_document_id)
SELECT d.id, s.id FROM documents d
JOIN documents s ON s.slug IN ('13-narrative', '09-business')
WHERE d.slug = 'deriv-investor'
ON CONFLICT DO NOTHING;

INSERT INTO document_sources (document_id, source_document_id)
SELECT d.id, s.id FROM documents d
JOIN documents s ON s.slug IN ('13-narrative', '06-value', '12-stakeholders')
WHERE d.slug = 'deriv-partner'
ON CONFLICT DO NOTHING;

INSERT INTO document_sources (document_id, source_document_id)
SELECT d.id, s.id FROM documents d
JOIN documents s ON s.slug IN ('12-stakeholders', '04-model', '06-value')
WHERE d.slug = 'deriv-partnership-offer'
ON CONFLICT DO NOTHING;

INSERT INTO document_sources (document_id, source_document_id)
SELECT d.id, s.id FROM documents d
JOIN documents s ON s.slug IN ('09-business', '10-governance', '13-narrative')
WHERE d.slug = 'deriv-investment-memo'
ON CONFLICT DO NOTHING;

INSERT INTO document_sources (document_id, source_document_id)
SELECT d.id, s.id FROM documents d
JOIN documents s ON s.slug IN ('01-identity', '03-vision', '06-value')
WHERE d.slug = 'deriv-messaging'
ON CONFLICT DO NOTHING;

INSERT INTO document_sources (document_id, source_document_id)
SELECT d.id, s.id FROM documents d
JOIN documents s ON s.slug IN ('01-identity', '03-vision', '06-value')
WHERE d.slug = 'deriv-brand'
ON CONFLICT DO NOTHING;

INSERT INTO document_sources (document_id, source_document_id)
SELECT d.id, s.id FROM documents d
JOIN documents s ON s.slug IN (
  '01-identity', '02-founders', '03-vision', '04-model', '05-professional', '06-value', '13-narrative'
)
WHERE d.slug = 'deriv-website'
ON CONFLICT DO NOTHING;

INSERT INTO document_sources (document_id, source_document_id)
SELECT d.id, s.id FROM documents d
JOIN documents s ON s.slug IN ('01-identity', '06-value', 'deriv-messaging')
WHERE d.slug = 'deriv-marketing'
ON CONFLICT DO NOTHING;

INSERT INTO document_versions (
  document_id, version, title, body, status, purpose, audience, owner_name,
  key_question, sources, prior_documents, decision_needed, next_action, saved_by
)
SELECT
  id, version, title, body, status, purpose, audience, owner_name,
  key_question, sources, prior_documents, decision_needed, next_action, 'seed'
FROM documents
WHERE NOT EXISTS (
  SELECT 1 FROM document_versions v WHERE v.document_id = documents.id AND v.version = documents.version
);

INSERT INTO ai_agents (slug, name, purpose, system_prompt) VALUES
(
  'draft-document',
  'טיוטת מסמך',
  'מנסח טיוטה בעברית למסמך אב או לנגזרת, בלי לדרוס מסמך מאושר.',
  $prompt$אתה עוזר למייסדים של המרכז הרב־תחומי לבריאות הנפש, מיזם שנמצא בשלב תכנון.
כתוב בעברית בלבד.
אל תמציא שירותים, מיקום, מחירים, רישוי או מסקנות משפטיות שלא מופיעים בחומר שקיבלת.
אם חסר מידע, כתוב במפורש מה חסר.
הכן טיוטה מובנית שהמייסדים יכולים לערוך. אל תציג את הטיוטה כמסמך מאושר.
התבסס על שאלת המפתח, המתווה והטקסט הקיים.$prompt$
),
(
  'summarize-meeting',
  'סיכום פגישה',
  'מסכם פגישת עבודה: דיון, החלטות שנוסחו, פערים ומה צריך להתעדכן.',
  $prompt$סכם פגישת עבודה של מייסדי המיזם בעברית.
כלול: מה נדון, החלטות שנוסחו במפורש, שאלות פתוחות, פערים, ומה צריך להתעדכן במסמכים אחרים.
אל תמציא החלטות שלא נאמרו. אם לא התקבלה החלטה, כתוב זאת.$prompt$
),
(
  'suggest-next-actions',
  'פעולות המשך',
  'מציע משימות המשך. ההחלה יוצרת משימות, ואינה משנה מסמך מאושר.',
  $prompt$הצע פעולות המשך קצרות בעברית מתוך החומר.
החזר JSON בלבד, בלי טקסט מסביב, במבנה:
{"tasks":[{"title":"...","details":"...","owner":"..."}]}
עד שמונה משימות. owner יכול להיות מחרוזת ריקה.
אל תכלול ייעוץ רפואי או משפטי. אל תמציא עובדות.$prompt$
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tasks (title, details, status, owner_name)
SELECT
  'הוספת תצוגה באנגלית',
  'האתר וממשק הניהול מוצגים בעברית בלבד (lang=he, dir=rtl). מילון אנגלי קיים כשלד ב־lib/i18n.ts ואינו מחובר. יש להוסיף בחירה בין עברית לאנגלית לאתר הציבורי ולניהול.',
  'open',
  'המייסדים'
WHERE NOT EXISTS (
  SELECT 1 FROM tasks WHERE title = 'הוספת תצוגה באנגלית'
);

-- >>> Replace both emails with the founders' Google accounts (lowercase) before running.
INSERT INTO users (email, name) VALUES
  ('talmonf@gmail.com', 'טלמון פרידלנדר'),
  ('Yoniravhon@gmail.com', 'יונתן רבהון')
ON CONFLICT (email) DO NOTHING;
