-- Demo / seed data (section 48). Everything here is explicitly marked
-- `is_demo = true` on creators, social_accounts and campaigns so it can be
-- filtered out or bulk-deleted before real creator data is imported. All
-- content_posts/content_metrics in this file use collection_method/source
-- = 'manual' — this seed does NOT pretend any of it came from a live API
-- sync, per the project's "never fabricate automatic sync" rule.
--
-- Safe to re-run: every insert is keyed by a fixed UUID with
-- `on conflict (id) do nothing`.

-- ============================================================
-- CREATORS (20)
-- ============================================================
insert into creators (
  id, first_name, last_name, display_name, country, city, languages, gender,
  categories, niches, creator_type, status, bio, internal_rating,
  brand_fit_score, is_demo
) values
  ('11111111-1111-1111-1111-111111111101', 'Sofia', 'Martinez', 'Sofia Martinez', 'USA', 'Miami', '{English,Spanish}', 'female', '{Lifestyle,Fashion}', '{outfits,day-in-the-life}', 'micro', 'approved', 'Miami-based lifestyle and fashion creator with a highly engaged local audience.', 4.5, 88, true),
  ('11111111-1111-1111-1111-111111111102', 'Diego', 'Ramirez', 'Diego Ramirez', 'USA', 'Miami', '{English,Spanish}', 'male', '{Fitness}', '{home-workouts,nutrition}', 'micro', 'active', 'Certified trainer sharing workouts and nutrition tips.', 4.2, 80, true),
  ('11111111-1111-1111-1111-111111111103', 'Ava', 'Chen', 'Ava Chen', 'USA', 'Los Angeles', '{English}', 'female', '{Beauty}', '{skincare,makeup-tutorials}', 'macro', 'active', 'Beauty creator known for in-depth product reviews.', 4.7, 91, true),
  ('11111111-1111-1111-1111-111111111104', 'Marcus', 'Johnson', 'Marcus Johnson', 'USA', 'New York', '{English}', 'male', '{Tech}', '{gadget-reviews,productivity}', 'micro', 'active', 'Tech reviewer focused on productivity gear.', 3.9, 72, true),
  ('11111111-1111-1111-1111-111111111105', 'Isabella', 'Rossi', 'Isabella Rossi', 'USA', 'Miami', '{English,Spanish,Italian}', 'female', '{Lifestyle,Travel}', '{luxury-travel,hotels}', 'mid', 'approved', 'Travel and lifestyle content across the Caribbean and Europe.', 4.4, 85, true),
  ('11111111-1111-1111-1111-111111111106', 'Liam', 'OConnor', 'Liam O''Connor', 'USA', 'Austin', '{English}', 'male', '{Gaming}', '{esports,streaming}', 'micro', 'prospect', 'Competitive gaming highlights and streams.', null, null, true),
  ('11111111-1111-1111-1111-111111111107', 'Camila', 'Torres', 'Camila Torres', 'USA', 'Miami', '{English,Spanish}', 'female', '{Fashion,Beauty}', '{thrifting,affordable-fashion}', 'nano', 'approved', 'Budget-friendly fashion finds and styling.', 4.0, 76, true),
  ('11111111-1111-1111-1111-111111111108', 'Noah', 'Kim', 'Noah Kim', 'USA', 'Los Angeles', '{English,Korean}', 'male', '{Food}', '{street-food,recipes}', 'micro', 'active', 'Food creator covering LA''s street food scene.', 4.3, 79, true),
  ('11111111-1111-1111-1111-111111111109', 'Valentina', 'Cruz', 'Valentina Cruz', 'USA', 'Miami', '{English,Spanish}', 'female', '{Lifestyle}', '{wellness,day-in-the-life}', 'macro', 'active', 'One of Miami''s top lifestyle voices with strong Reel performance.', 4.8, 93, true),
  ('11111111-1111-1111-1111-111111111110', 'Ethan', 'Brooks', 'Ethan Brooks', 'USA', 'Chicago', '{English}', 'male', '{Fitness,Wellness}', '{running,mental-health}', 'mid', 'inactive', 'Currently paused — was strong on running content.', 3.5, 60, true),
  ('11111111-1111-1111-1111-111111111111', 'Mia', 'Alvarez', 'Mia Alvarez', 'USA', 'Miami', '{English,Spanish}', 'female', '{Travel}', '{beach-destinations,boat-life}', 'micro', 'approved', 'South Florida travel and boat-life content.', 4.1, 82, true),
  ('11111111-1111-1111-1111-111111111112', 'Lucas', 'Silva', 'Lucas Silva', 'Brazil', 'Sao Paulo', '{Portuguese,English}', 'male', '{Music}', '{dj-sets,nightlife}', 'mid', 'active', 'DJ and nightlife content creator with cross-border reach.', 4.0, 74, true),
  ('11111111-1111-1111-1111-111111111113', 'Zoe', 'Bennett', 'Zoe Bennett', 'USA', 'New York', '{English}', 'female', '{Fashion}', '{streetwear,editorial}', 'macro', 'active', 'Fashion editorial and streetwear creator.', 4.6, 89, true),
  ('11111111-1111-1111-1111-111111111114', 'Gabriel', 'Santos', 'Gabriel Santos', 'USA', 'Miami', '{English,Spanish}', 'male', '{Sports}', '{soccer,training}', 'micro', 'active', 'Soccer training drills and highlights.', 4.2, 78, true),
  ('11111111-1111-1111-1111-111111111115', 'Chloe', 'Nguyen', 'Chloe Nguyen', 'USA', 'Los Angeles', '{English}', 'female', '{Beauty}', '{nails,skincare}', 'nano', 'prospect', 'Rising nail-art and skincare creator.', null, null, true),
  ('11111111-1111-1111-1111-111111111116', 'Ryan', 'Foster', 'Ryan Foster', 'USA', 'Miami', '{English}', 'male', '{Lifestyle,Tech}', '{smart-home,productivity}', 'mid', 'approved', 'Lifestyle-meets-tech creator, strong YouTube long-form.', 4.3, 81, true),
  ('11111111-1111-1111-1111-111111111117', 'Amara', 'Okafor', 'Amara Okafor', 'USA', 'Atlanta', '{English}', 'female', '{Fashion}', '{sustainable-fashion}', 'micro', 'active', 'Sustainable and secondhand fashion advocate.', 4.4, 84, true),
  ('11111111-1111-1111-1111-111111111118', 'Tyler', 'Reed', 'Tyler Reed', 'USA', 'Miami', '{English}', 'other', '{Comedy}', '{skits,pranks}', 'mega', 'do_not_work_with', 'Large following but repeated brand-safety issues on past campaigns.', 1.5, 20, true),
  ('11111111-1111-1111-1111-111111111119', 'Elena', 'Petrova', 'Elena Petrova', 'USA', 'Miami', '{English,Russian}', 'female', '{Wellness,Beauty}', '{skincare,yoga}', 'micro', 'active', 'Wellness and skincare routines, strong TikTok engagement.', 4.5, 86, true),
  ('11111111-1111-1111-1111-111111111120', 'Jordan', 'Blake', 'Jordan Blake', 'USA', 'Miami', '{English}', 'nonbinary', '{Lifestyle}', '{coffee,city-life}', 'nano', 'active', 'Miami city-life and coffee shop content.', 3.8, 70, true)
on conflict (id) do nothing;

-- ============================================================
-- SOCIAL ACCOUNTS
-- ============================================================
insert into social_accounts (
  id, creator_id, platform, username, profile_url, followers, following,
  posts_count, engagement_rate, average_likes, average_comments,
  average_views, estimated_reach, account_type, is_connected, oauth_status,
  sync_status, is_demo
) values
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111101', 'instagram', 'sofia.martinez', 'https://instagram.com/sofia.martinez', 92000, 850, 640, 4.7, 3800, 210, 28000, 45000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111101', 'tiktok', 'sofia.martinez', 'https://tiktok.com/@sofia.martinez', 61000, 300, 210, 6.1, 2900, 180, 71000, 98000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111102', 'instagram', 'diego.fit', 'https://instagram.com/diego.fit', 48000, 500, 480, 5.2, 2100, 95, 19000, 26000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111102', 'tiktok', 'diego.fit', 'https://tiktok.com/@diego.fit', 73000, 220, 340, 7.4, 4200, 260, 88000, 110000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333305', '11111111-1111-1111-1111-111111111103', 'instagram', 'avachenbeauty', 'https://instagram.com/avachenbeauty', 310000, 620, 1200, 3.4, 9800, 420, 95000, 180000, 'business', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333306', '11111111-1111-1111-1111-111111111103', 'youtube', 'AvaChenBeauty', 'https://youtube.com/@AvaChenBeauty', 145000, 20, 310, 2.1, 3100, 260, 62000, 90000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333307', '11111111-1111-1111-1111-111111111104', 'instagram', 'marcus.tech', 'https://instagram.com/marcus.tech', 54000, 410, 390, 3.1, 1600, 60, 21000, 30000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333308', '11111111-1111-1111-1111-111111111104', 'x', 'marcustech', 'https://x.com/marcustech', 38000, 900, 5200, 1.8, 420, 40, 12000, 20000, 'personal', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333309', '11111111-1111-1111-1111-111111111105', 'instagram', 'isabellarossi', 'https://instagram.com/isabellarossi', 165000, 700, 890, 3.9, 5900, 240, 58000, 92000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333310', '11111111-1111-1111-1111-111111111105', 'tiktok', 'isabellarossi', 'https://tiktok.com/@isabellarossi', 88000, 150, 260, 5.6, 4400, 190, 96000, 130000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333311', '11111111-1111-1111-1111-111111111106', 'tiktok', 'liamplays', 'https://tiktok.com/@liamplays', 41000, 180, 150, 4.9, 1900, 130, 47000, 60000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333312', '11111111-1111-1111-1111-111111111106', 'youtube', 'LiamPlaysLive', 'https://youtube.com/@LiamPlaysLive', 22000, 5, 95, 1.9, 380, 55, 8900, 14000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333313', '11111111-1111-1111-1111-111111111107', 'instagram', 'camilastyle', 'https://instagram.com/camilastyle', 18000, 400, 310, 5.8, 980, 70, 8100, 12000, 'personal', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333314', '11111111-1111-1111-1111-111111111108', 'instagram', 'noaheatsla', 'https://instagram.com/noaheatsla', 67000, 520, 610, 4.4, 2700, 140, 24000, 34000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333315', '11111111-1111-1111-1111-111111111108', 'tiktok', 'noaheatsla', 'https://tiktok.com/@noaheatsla', 95000, 210, 280, 6.8, 5600, 310, 118000, 150000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333316', '11111111-1111-1111-1111-111111111109', 'instagram', 'valentinacruz', 'https://instagram.com/valentinacruz', 420000, 900, 1450, 4.1, 15200, 680, 140000, 260000, 'business', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333317', '11111111-1111-1111-1111-111111111109', 'tiktok', 'valentinacruz', 'https://tiktok.com/@valentinacruz', 310000, 400, 520, 7.9, 21000, 940, 380000, 480000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333318', '11111111-1111-1111-1111-111111111109', 'youtube', 'ValentinaCruzVlogs', 'https://youtube.com/@ValentinaCruzVlogs', 88000, 10, 180, 2.6, 1900, 160, 41000, 60000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333319', '11111111-1111-1111-1111-111111111110', 'instagram', 'ethanrunsbrooks', 'https://instagram.com/ethanrunsbrooks', 76000, 330, 700, 2.4, 1500, 55, 18000, 27000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333320', '11111111-1111-1111-1111-111111111111', 'instagram', 'miaalvarez', 'https://instagram.com/miaalvarez', 54000, 610, 420, 4.6, 2200, 110, 21000, 29000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333321', '11111111-1111-1111-1111-111111111111', 'tiktok', 'miaalvarez', 'https://tiktok.com/@miaalvarez', 39000, 190, 160, 5.9, 2000, 120, 44000, 58000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333322', '11111111-1111-1111-1111-111111111112', 'instagram', 'lucassilvadj', 'https://instagram.com/lucassilvadj', 130000, 800, 540, 3.3, 3900, 150, 47000, 70000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333323', '11111111-1111-1111-1111-111111111112', 'tiktok', 'lucassilvadj', 'https://tiktok.com/@lucassilvadj', 96000, 250, 300, 6.2, 5300, 200, 89000, 120000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333324', '11111111-1111-1111-1111-111111111113', 'instagram', 'zoebennett', 'https://instagram.com/zoebennett', 280000, 700, 980, 3.6, 8600, 350, 87000, 150000, 'business', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333325', '11111111-1111-1111-1111-111111111113', 'youtube', 'ZoeBennettStyle', 'https://youtube.com/@ZoeBennettStyle', 61000, 15, 140, 2.0, 1200, 90, 26000, 38000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333326', '11111111-1111-1111-1111-111111111114', 'instagram', 'gabrielsantos', 'https://instagram.com/gabrielsantos', 58000, 400, 380, 4.9, 2600, 130, 22000, 31000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333327', '11111111-1111-1111-1111-111111111114', 'tiktok', 'gabrielsantos', 'https://tiktok.com/@gabrielsantos', 71000, 210, 240, 6.5, 4300, 220, 82000, 105000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333328', '11111111-1111-1111-1111-111111111115', 'tiktok', 'chloenails', 'https://tiktok.com/@chloenails', 15000, 90, 60, 5.1, 700, 45, 16000, 21000, 'personal', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333329', '11111111-1111-1111-1111-111111111116', 'instagram', 'ryanfosterlife', 'https://instagram.com/ryanfosterlife', 112000, 480, 650, 3.2, 3300, 140, 39000, 58000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333330', '11111111-1111-1111-1111-111111111116', 'youtube', 'RyanFosterLife', 'https://youtube.com/@RyanFosterLife', 94000, 12, 210, 2.8, 2400, 190, 45000, 66000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111117', 'instagram', 'amaraokafor', 'https://instagram.com/amaraokafor', 82000, 520, 460, 4.8, 3500, 170, 30000, 42000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111118', 'tiktok', 'tylerreedcomedy', 'https://tiktok.com/@tylerreedcomedy', 2800000, 60, 900, 8.9, 210000, 8900, 3100000, 3900000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111119', 'instagram', 'elenapetrova', 'https://instagram.com/elenapetrova', 71000, 390, 520, 4.6, 3000, 160, 26000, 37000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333334', '11111111-1111-1111-1111-111111111119', 'tiktok', 'elenapetrova', 'https://tiktok.com/@elenapetrova', 58000, 200, 190, 6.9, 3600, 210, 68000, 88000, 'creator', false, 'not_connected', 'never_synced', true),
  ('33333333-3333-3333-3333-333333333335', '11111111-1111-1111-1111-111111111120', 'instagram', 'jordanblakemia', 'https://instagram.com/jordanblakemia', 14000, 300, 240, 5.4, 680, 55, 6100, 9000, 'personal', false, 'not_connected', 'never_synced', true)
on conflict (id) do nothing;

-- ============================================================
-- CAMPAIGNS (5)
-- ============================================================
insert into campaigns (
  id, campaign_name, client_name, brand_name, description, market, country,
  city, campaign_type, start_date, end_date, budget, status,
  campaign_objectives, target_audience, target_categories, target_platforms,
  creator_requirements, is_demo
) values
  ('22222222-2222-2222-2222-222222222201', 'Sunset Kicks Summer Launch', 'Sunset Kicks', 'Sunset Kicks Footwear', 'Launch campaign for the new summer sandal line, Miami-focused.', 'Miami', 'USA', 'Miami', 'Product Launch', current_date - interval '20 days', current_date + interval '10 days', 15000, 'active', 'Drive awareness and sales for the summer sandal line among 18-34 lifestyle audiences.', '{"age_range":"18-34","gender":"all","locations":["Miami"],"interests":["fashion","lifestyle"],"languages":["English","Spanish"]}', '{Lifestyle,Fashion}', '{instagram,tiktok}', '{"min_followers":30000,"max_followers":200000,"min_engagement":3.5,"creator_types":["micro","mid"],"budget_per_creator":1500,"creator_count":6}', true),
  ('22222222-2222-2222-2222-222222222202', 'Glow Beauty Holiday Campaign', 'Glow Cosmetics', 'Glow', 'Holiday gifting push for Glow''s new palette line.', 'National', 'USA', null, 'Seasonal', current_date - interval '90 days', current_date - interval '30 days', 25000, 'completed', 'Maximize reach and drive gifting-season sales.', '{"age_range":"18-40","gender":"female","locations":["National"],"interests":["beauty"],"languages":["English"]}', '{Beauty}', '{instagram,youtube}', '{"min_followers":50000,"min_engagement":2.5,"creator_types":["macro","mid"],"budget_per_creator":4000,"creator_count":3}', true),
  ('22222222-2222-2222-2222-222222222203', 'FitPulse App Launch', 'FitPulse', 'FitPulse', 'Fitness app launch targeting home-workout audiences.', 'National', 'USA', null, 'App Launch', current_date + interval '5 days', current_date + interval '45 days', 12000, 'recruiting', 'Drive app installs via authentic workout content.', '{"age_range":"20-40","gender":"all","locations":["National"],"interests":["fitness","wellness"],"languages":["English"]}', '{Fitness,Wellness}', '{instagram,tiktok}', '{"min_followers":20000,"min_engagement":4,"creator_types":["micro","mid"],"budget_per_creator":1200,"creator_count":8}', true),
  ('22222222-2222-2222-2222-222222222204', 'Nomad Travel Gear Spring', 'Nomad Travel Co', 'Nomad', 'Spring travel gear collection featuring durable carry-on bags.', 'National', 'USA', null, 'Product Launch', current_date + interval '30 days', current_date + interval '75 days', 18000, 'draft', 'Introduce the spring carry-on line to travel-focused audiences.', '{"age_range":"22-45","gender":"all","locations":["National"],"interests":["travel"],"languages":["English"]}', '{Travel,Lifestyle}', '{instagram,tiktok}', '{"min_followers":40000,"min_engagement":3,"creator_types":["micro","mid","macro"],"budget_per_creator":2000,"creator_count":5}', true),
  ('22222222-2222-2222-2222-222222222205', 'EchoSound Headphones Drop', 'EchoSound', 'EchoSound', 'Launch of the EchoSound Pro wireless headphones.', 'National', 'USA', null, 'Product Launch', current_date - interval '10 days', current_date + interval '20 days', 20000, 'active', 'Generate buzz and unboxing content around the EchoSound Pro drop.', '{"age_range":"18-35","gender":"all","locations":["National"],"interests":["tech","music"],"languages":["English"]}', '{Tech,Music}', '{instagram,x,youtube}', '{"min_followers":30000,"min_engagement":2.5,"creator_types":["micro","mid","macro"],"budget_per_creator":2500,"creator_count":4}', true)
on conflict (id) do nothing;

-- ============================================================
-- CAMPAIGN CREATORS
-- ============================================================
insert into campaign_creators (
  id, campaign_id, creator_id, status, negotiated_fee, approved_fee,
  payment_status, contract_status, briefing_status, match_score, match_reasons
) values
  ('66666666-6666-6666-6666-666666666601', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'active', 1400, 1400, 'paid', 'signed', 'complete', 94, '{"Miami based","Lifestyle & fashion niche","92K followers in target range","4.7% engagement"}'),
  ('66666666-6666-6666-6666-666666666602', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111109', 'active', 2200, 2200, 'partial', 'signed', 'complete', 91, '{"Miami based","Strong historical Reel performance","Fits campaign budget"}'),
  ('66666666-6666-6666-6666-666666666603', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111107', 'contracted', 700, 700, 'unpaid', 'signed', 'in_progress', 82, '{"Miami based","Fashion niche","Budget-efficient nano creator"}'),
  ('66666666-6666-6666-6666-666666666604', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111120', 'shortlisted', null, null, 'unpaid', 'not_sent', 'not_sent', 75, '{"Miami based","Lifestyle niche","Budget fit"}'),
  ('66666666-6666-6666-6666-666666666605', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111103', 'completed', 8000, 8000, 'paid', 'signed', 'complete', 96, '{"Beauty niche match","Strong YouTube + Instagram combo","310K reach"}'),
  ('66666666-6666-6666-6666-666666666606', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111113', 'completed', 6500, 6500, 'paid', 'signed', 'complete', 88, '{"Fashion-adjacent audience overlap","Strong engagement"}'),
  ('66666666-6666-6666-6666-666666666607', '22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111102', 'negotiating', 1100, null, 'unpaid', 'sent', 'not_sent', 89, '{"Fitness niche match","High engagement rate","Home-workout content history"}'),
  ('66666666-6666-6666-6666-666666666608', '22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111119', 'suggested', null, null, 'unpaid', 'not_sent', 'not_sent', 78, '{"Wellness niche","Strong TikTok engagement"}'),
  ('66666666-6666-6666-6666-666666666609', '22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111104', 'active', 1800, 1800, 'invoiced', 'signed', 'complete', 85, '{"Tech niche match","X + Instagram combo for launch buzz"}'),
  ('66666666-6666-6666-6666-666666666610', '22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111112', 'active', 2400, 2400, 'unpaid', 'signed', 'in_progress', 80, '{"Music niche","Cross-border reach","Strong TikTok performance"}')
on conflict (id) do nothing;

-- ============================================================
-- DELIVERABLES
-- ============================================================
insert into deliverables (
  id, campaign_id, creator_id, platform, content_type, quantity, due_date,
  status, instructions, caption_required, approval_required, published_url,
  published_at
) values
  ('44444444-4444-4444-4444-444444444401', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'instagram', 'instagram_reel', 1, current_date - interval '10 days', 'published', 'Feature the new sandal line in a beach day-in-the-life Reel.', true, true, 'https://instagram.com/reel/sunset-kicks-sofia-001', now() - interval '10 days'),
  ('44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'instagram', 'instagram_story', 3, current_date - interval '8 days', 'published', 'Story series showing the sandals styled 3 ways.', false, false, null, null),
  ('44444444-4444-4444-4444-444444444403', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111109', 'tiktok', 'tiktok', 1, current_date - interval '5 days', 'published', 'TikTok GRWM featuring the sandals.', true, true, 'https://tiktok.com/@valentinacruz/video/sunset-kicks-001', now() - interval '5 days'),
  ('44444444-4444-4444-4444-444444444404', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111107', 'instagram', 'instagram_post', 1, current_date - interval '2 days', 'not_started', 'Static post styling the sandals with summer outfits.', true, false, null, null),
  ('44444444-4444-4444-4444-444444444405', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111109', 'instagram', 'instagram_reel', 1, current_date + interval '4 days', 'approved', 'Second Reel — pool day styling.', true, true, null, null),
  ('44444444-4444-4444-4444-444444444406', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111103', 'instagram', 'instagram_reel', 2, current_date - interval '60 days', 'published', 'Palette tutorial Reels.', true, true, 'https://instagram.com/reel/glow-ava-001', now() - interval '60 days'),
  ('44444444-4444-4444-4444-444444444407', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111103', 'youtube', 'youtube_video', 1, current_date - interval '55 days', 'published', 'Full holiday palette review.', true, true, 'https://youtube.com/watch?v=glow-ava-review', now() - interval '55 days'),
  ('44444444-4444-4444-4444-444444444408', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111113', 'instagram', 'instagram_post', 1, current_date - interval '58 days', 'published', 'Editorial-style flatlay post.', true, false, 'https://instagram.com/p/glow-zoe-001', now() - interval '58 days'),
  ('44444444-4444-4444-4444-444444444409', '22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111104', 'x', 'x_post', 2, current_date - interval '6 days', 'published', 'Launch-day unboxing thread.', false, false, 'https://x.com/marcustech/status/echosound-001', now() - interval '6 days'),
  ('44444444-4444-4444-4444-444444444410', '22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111112', 'tiktok', 'tiktok', 1, current_date - interval '3 days', 'published', 'DJ set wearing the headphones.', true, true, 'https://tiktok.com/@lucassilvadj/video/echosound-001', now() - interval '3 days'),
  ('44444444-4444-4444-4444-444444444411', '22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111112', 'instagram', 'instagram_reel', 1, current_date + interval '6 days', 'draft', 'Follow-up Reel — a day in the studio.', true, true, null, null)
on conflict (id) do nothing;

-- ============================================================
-- CONTENT POSTS (linked to published deliverables above)
-- ============================================================
insert into content_posts (
  id, campaign_id, creator_id, deliverable_id, social_account_id, platform,
  content_type, post_url, thumbnail_url, caption, published_at,
  collection_method, sync_status
) values
  ('55555555-5555-5555-5555-555555555501', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', '44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301', 'instagram', 'instagram_reel', 'https://instagram.com/reel/sunset-kicks-sofia-001', null, 'Beach day in the new Sunset Kicks sandals ☀️ #ad', now() - interval '10 days', 'manual', 'never_synced'),
  ('55555555-5555-5555-5555-555555555502', '22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111109', '44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333317', 'tiktok', 'tiktok', 'https://tiktok.com/@valentinacruz/video/sunset-kicks-001', null, 'GRWM ft. @sunsetkicks sandals', now() - interval '5 days', 'manual', 'never_synced'),
  ('55555555-5555-5555-5555-555555555503', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111103', '44444444-4444-4444-4444-444444444406', '33333333-3333-3333-3333-333333333305', 'instagram', 'instagram_reel', 'https://instagram.com/reel/glow-ava-001', null, 'Holiday palette tutorial ✨ #ad @glowcosmetics', now() - interval '60 days', 'manual', 'never_synced'),
  ('55555555-5555-5555-5555-555555555504', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111103', '44444444-4444-4444-4444-444444444407', '33333333-3333-3333-3333-333333333306', 'youtube', 'youtube_video', 'https://youtube.com/watch?v=glow-ava-review', null, 'Full review: Glow Holiday Palette', now() - interval '55 days', 'manual', 'never_synced'),
  ('55555555-5555-5555-5555-555555555505', '22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111113', '44444444-4444-4444-4444-444444444408', '33333333-3333-3333-3333-333333333324', 'instagram', 'instagram_post', 'https://instagram.com/p/glow-zoe-001', null, 'Gifting season, sorted. #ad', now() - interval '58 days', 'manual', 'never_synced'),
  ('55555555-5555-5555-5555-555555555506', '22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111104', '44444444-4444-4444-4444-444444444409', '33333333-3333-3333-3333-333333333308', 'x', 'x_post', 'https://x.com/marcustech/status/echosound-001', null, 'Unboxing the EchoSound Pro — first impressions 🧵 #ad', now() - interval '6 days', 'manual', 'never_synced'),
  ('55555555-5555-5555-5555-555555555507', '22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111112', '44444444-4444-4444-4444-444444444410', '33333333-3333-3333-3333-333333333323', 'tiktok', 'tiktok', 'https://tiktok.com/@lucassilvadj/video/echosound-001', null, 'Set ft. @echosound Pro 🎧 #ad', now() - interval '3 days', 'manual', 'never_synced')
on conflict (id) do nothing;

-- ============================================================
-- CONTENT METRICS (historical — multiple captures per post)
-- ============================================================
insert into content_metrics (
  content_id, captured_at, source, views, reach, impressions, likes,
  comments, shares, saves, engagements, engagement_rate
) values
  ('55555555-5555-5555-5555-555555555501', now() - interval '9 days', 'manual', 38000, 32000, 41000, 4200, 180, 90, 260, 4730, 12.4),
  ('55555555-5555-5555-5555-555555555501', now() - interval '3 days', 'manual', 61000, 47000, 66000, 6100, 260, 150, 410, 6920, 11.3),
  ('55555555-5555-5555-5555-555555555502', now() - interval '4 days', 'manual', 210000, 165000, 230000, 24000, 980, 1400, 2200, 28580, 13.6),
  ('55555555-5555-5555-5555-555555555502', now() - interval '1 days', 'manual', 340000, 240000, 360000, 39000, 1500, 2100, 3400, 46000, 13.5),
  ('55555555-5555-5555-5555-555555555503', now() - interval '58 days', 'manual', 88000, 71000, 94000, 9200, 410, 300, 620, 10530, 11.9),
  ('55555555-5555-5555-5555-555555555503', now() - interval '40 days', 'manual', 112000, 89000, 121000, 11800, 520, 380, 780, 13480, 12.0),
  ('55555555-5555-5555-5555-555555555504', now() - interval '52 days', 'manual', 42000, 38000, 44000, 2100, 340, 120, 260, 2820, 6.7),
  ('55555555-5555-5555-5555-555555555505', now() - interval '56 days', 'manual', null, 58000, 61000, 3200, 90, 60, 150, 3500, 6.0),
  ('55555555-5555-5555-5555-555555555506', now() - interval '5 days', 'manual', 24000, 19000, 26000, 980, 120, 210, null, 1310, 5.5),
  ('55555555-5555-5555-5555-555555555507', now() - interval '2 days', 'manual', 76000, 61000, 82000, 6900, 240, 410, 520, 8070, 8.4)
on conflict do nothing;

-- ============================================================
-- CREATOR PERFORMANCE SNAPSHOTS (accumulated historical intelligence)
-- ============================================================
insert into creator_performance_snapshots (
  creator_id, campaign_id, content_id, snapshot_date, reach, views,
  engagements, engagement_rate, cpm, cpe, cost_per_reach
) values
  ('11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', current_date - interval '3 days', 47000, 61000, 6920, 11.3, 22.95, 0.20, 0.03),
  ('11111111-1111-1111-1111-111111111109', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555502', current_date - interval '1 days', 240000, 340000, 46000, 13.5, 6.47, 0.05, 0.01),
  ('11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555503', current_date - interval '40 days', 89000, 112000, 13480, 12.0, 71.43, 0.59, 0.09),
  ('11111111-1111-1111-1111-111111111113', '22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555505', current_date - interval '56 days', 58000, null, 3500, 6.0, 112.07, 1.86, 0.11)
on conflict do nothing;

-- ============================================================
-- STORY METRICS (manual tracking example)
-- ============================================================
insert into story_metrics (
  creator_id, campaign_id, social_account_id, deliverable_id, story_date,
  story_sequence, views, reach, replies, link_clicks, sticker_taps, exits, notes
) values
  ('11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444402', current_date - interval '8 days', 1, 18000, 15000, 42, 310, 220, 1200, 'Styled sandals with linen outfit'),
  ('11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444402', current_date - interval '8 days', 2, 16500, 14100, 38, 280, 190, 1400, 'Sandals with denim outfit'),
  ('11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', '44444444-4444-4444-4444-444444444402', current_date - interval '7 days', 3, 15200, 13000, 30, 260, 170, 1550, 'Sandals with dress, swipe-up link')
on conflict do nothing;
