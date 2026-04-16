-- ============================================================================
-- Row Level Security (RLS) Policies for Cantólico
-- ============================================================================
-- Execute this in Supabase SQL Editor to enable RLS on core tables.
-- This version is aligned with current schema names/columns from src/types/supabase.ts

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Clerk auth uid (text/uuid) -> internal numeric user id
CREATE OR REPLACE FUNCTION get_my_user_id()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id INT;
BEGIN
  SELECT id INTO user_id
  FROM "User"
  WHERE "clerkUserId" = auth.uid()::text;

  RETURN user_id;
END;
$$;

-- Current internal user role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM "User"
  WHERE id = get_my_user_id();

  RETURN user_role;
END;
$$;

-- Current internal user email
CREATE OR REPLACE FUNCTION get_my_email()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM "User"
  WHERE id = get_my_user_id();

  RETURN user_email;
END;
$$;


-- ============================================================================
-- 1. ENABLE RLS ON CORE TABLES
-- ============================================================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Song" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Mass" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Playlist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlaylistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlaylistMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Banner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MassItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SongSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Star" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Favorite" ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 2. USER TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users are publicly readable" ON "User";
DROP POLICY IF EXISTS "Users can update own profile" ON "User";

CREATE POLICY "Users are publicly readable" ON "User"
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON "User"
  FOR UPDATE USING (id = get_my_user_id())
  WITH CHECK (id = get_my_user_id());


-- ============================================================================
-- 3. SONG TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Published songs are readable by anyone" ON "Song";
DROP POLICY IF EXISTS "Authenticated users can create songs" ON "Song";
DROP POLICY IF EXISTS "Song creators or admins can update songs" ON "Song";
DROP POLICY IF EXISTS "Song creators or admins can delete songs" ON "Song";

-- Public song = has current version set
CREATE POLICY "Published songs are readable by anyone" ON "Song"
  FOR SELECT USING ("currentVersionId" IS NOT NULL);

CREATE POLICY "Authenticated users can create songs" ON "Song"
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Song creators or admins can update songs" ON "Song"
  FOR UPDATE USING (
    get_my_role() IN ('ADMIN', 'REVIEWER')
    OR EXISTS (
      SELECT 1
      FROM "SongVersion" sv
      WHERE sv."songId" = "Song".id
        AND sv."createdById" = get_my_user_id()
    )
  )
  WITH CHECK (
    get_my_role() IN ('ADMIN', 'REVIEWER')
    OR EXISTS (
      SELECT 1
      FROM "SongVersion" sv
      WHERE sv."songId" = "Song".id
        AND sv."createdById" = get_my_user_id()
    )
  );

CREATE POLICY "Song creators or admins can delete songs" ON "Song"
  FOR DELETE USING (
    get_my_role() IN ('ADMIN', 'REVIEWER')
    OR EXISTS (
      SELECT 1
      FROM "SongVersion" sv
      WHERE sv."songId" = "Song".id
        AND sv."createdById" = get_my_user_id()
    )
  );


-- ============================================================================
-- 4. MASS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Public masses are readable by anyone" ON "Mass";
DROP POLICY IF EXISTS "Users can read own and not_listed masses" ON "Mass";
DROP POLICY IF EXISTS "Authenticated users can create masses" ON "Mass";
DROP POLICY IF EXISTS "Mass owners can update own masses" ON "Mass";
DROP POLICY IF EXISTS "Mass owners can delete own masses" ON "Mass";

CREATE POLICY "Public masses are readable by anyone" ON "Mass"
  FOR SELECT USING (visibility = 'PUBLIC');

CREATE POLICY "Users can read own and not_listed masses" ON "Mass"
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      "userId" = get_my_user_id()
      OR visibility = 'NOT_LISTED'
    )
  );

CREATE POLICY "Authenticated users can create masses" ON "Mass"
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND "userId" = get_my_user_id()
  );

CREATE POLICY "Mass owners can update own masses" ON "Mass"
  FOR UPDATE USING (
    "userId" = get_my_user_id()
    OR get_my_role() = 'ADMIN'
  )
  WITH CHECK (
    "userId" = get_my_user_id()
    OR get_my_role() = 'ADMIN'
  );

CREATE POLICY "Mass owners can delete own masses" ON "Mass"
  FOR DELETE USING (
    "userId" = get_my_user_id()
    OR get_my_role() = 'ADMIN'
  );


-- ============================================================================
-- 5. MASS ITEM TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "MassItems from public masses are readable" ON "MassItem";
DROP POLICY IF EXISTS "Users can read items from own or unlisted masses" ON "MassItem";
DROP POLICY IF EXISTS "Only mass owners can manage mass items" ON "MassItem";

CREATE POLICY "MassItems from public masses are readable" ON "MassItem"
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM "Mass" m
      WHERE m.id = "MassItem"."massId"
        AND m.visibility = 'PUBLIC'
    )
  );

CREATE POLICY "Users can read items from own or unlisted masses" ON "MassItem"
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1
      FROM "Mass" m
      WHERE m.id = "MassItem"."massId"
        AND (
          m."userId" = get_my_user_id()
          OR m.visibility = 'NOT_LISTED'
        )
    )
  );

CREATE POLICY "Only mass owners can manage mass items" ON "MassItem"
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM "Mass" m
      WHERE m.id = "MassItem"."massId"
        AND m."userId" = get_my_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "Mass" m
      WHERE m.id = "MassItem"."massId"
        AND m."userId" = get_my_user_id()
    )
  );


-- ============================================================================
-- 6. PLAYLIST TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Public playlists are readable" ON "Playlist";
DROP POLICY IF EXISTS "Users can read own and member playlists" ON "Playlist";
DROP POLICY IF EXISTS "Authenticated users can create playlists" ON "Playlist";
DROP POLICY IF EXISTS "Playlist owners can update own playlists" ON "Playlist";
DROP POLICY IF EXISTS "Playlist owners can delete own playlists" ON "Playlist";

CREATE POLICY "Public playlists are readable" ON "Playlist"
  FOR SELECT USING ("isPublic" = true);

CREATE POLICY "Users can read own and member playlists" ON "Playlist"
  FOR SELECT USING (
    "userId" = get_my_user_id()
    OR EXISTS (
      SELECT 1
      FROM "PlaylistMember" pm
      WHERE pm."playlistId" = "Playlist".id
        AND pm."userEmail" = get_my_email()
        AND pm.status = 'ACCEPTED'
    )
  );

CREATE POLICY "Authenticated users can create playlists" ON "Playlist"
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND "userId" = get_my_user_id()
  );

CREATE POLICY "Playlist owners can update own playlists" ON "Playlist"
  FOR UPDATE USING (
    "userId" = get_my_user_id()
    OR get_my_role() = 'ADMIN'
  )
  WITH CHECK (
    "userId" = get_my_user_id()
    OR get_my_role() = 'ADMIN'
  );

CREATE POLICY "Playlist owners can delete own playlists" ON "Playlist"
  FOR DELETE USING (
    "userId" = get_my_user_id()
    OR get_my_role() = 'ADMIN'
  );


-- ============================================================================
-- 7. PLAYLIST ITEM TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "PlaylistItems from public playlists are readable" ON "PlaylistItem";
DROP POLICY IF EXISTS "Users can read items from own and member playlists" ON "PlaylistItem";
DROP POLICY IF EXISTS "Playlist members can manage items" ON "PlaylistItem";

CREATE POLICY "PlaylistItems from public playlists are readable" ON "PlaylistItem"
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM "Playlist" p
      WHERE p.id = "PlaylistItem"."playlistId"
        AND p."isPublic" = true
    )
  );

CREATE POLICY "Users can read items from own and member playlists" ON "PlaylistItem"
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM "Playlist" p
      LEFT JOIN "PlaylistMember" pm ON p.id = pm."playlistId"
      WHERE p.id = "PlaylistItem"."playlistId"
        AND (
          p."userId" = get_my_user_id()
          OR (pm."userEmail" = get_my_email() AND pm.status = 'ACCEPTED')
        )
    )
  );

CREATE POLICY "Playlist members can manage items" ON "PlaylistItem"
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM "Playlist" p
      LEFT JOIN "PlaylistMember" pm ON p.id = pm."playlistId"
      WHERE p.id = "PlaylistItem"."playlistId"
        AND (
          p."userId" = get_my_user_id()
          OR (
            pm."userEmail" = get_my_email()
            AND pm.role = 'EDITOR'
            AND pm.status = 'ACCEPTED'
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "Playlist" p
      LEFT JOIN "PlaylistMember" pm ON p.id = pm."playlistId"
      WHERE p.id = "PlaylistItem"."playlistId"
        AND (
          p."userId" = get_my_user_id()
          OR (
            pm."userEmail" = get_my_email()
            AND pm.role = 'EDITOR'
            AND pm.status = 'ACCEPTED'
          )
        )
    )
  );


-- ============================================================================
-- 8. PLAYLIST MEMBER TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Members of public playlists are readable" ON "PlaylistMember";
DROP POLICY IF EXISTS "Users can read members from own and member playlists" ON "PlaylistMember";
DROP POLICY IF EXISTS "Only playlist owner can manage members" ON "PlaylistMember";
DROP POLICY IF EXISTS "Users can update their own membership status" ON "PlaylistMember";

CREATE POLICY "Members of public playlists are readable" ON "PlaylistMember"
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM "Playlist" p
      WHERE p.id = "PlaylistMember"."playlistId"
        AND p."isPublic" = true
    )
  );

CREATE POLICY "Users can read members from own and member playlists" ON "PlaylistMember"
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM "Playlist" p
      LEFT JOIN "PlaylistMember" pm_self ON p.id = pm_self."playlistId"
      WHERE p.id = "PlaylistMember"."playlistId"
        AND (
          p."userId" = get_my_user_id()
          OR (pm_self."userEmail" = get_my_email() AND pm_self.status = 'ACCEPTED')
          OR "PlaylistMember"."userEmail" = get_my_email()
        )
    )
  );

CREATE POLICY "Only playlist owner can manage members" ON "PlaylistMember"
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM "Playlist" p
      WHERE p.id = "PlaylistMember"."playlistId"
        AND p."userId" = get_my_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "Playlist" p
      WHERE p.id = "PlaylistMember"."playlistId"
        AND p."userId" = get_my_user_id()
    )
  );

CREATE POLICY "Users can update their own membership status" ON "PlaylistMember"
  FOR UPDATE USING ("userEmail" = get_my_email())
  WITH CHECK ("userEmail" = get_my_email());


-- ============================================================================
-- 9. BANNER TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Active banners are readable" ON "Banner";
DROP POLICY IF EXISTS "Only admins can manage banners" ON "Banner";

CREATE POLICY "Active banners are readable" ON "Banner"
  FOR SELECT USING (
    "isActive" = true
    AND ("startDate" IS NULL OR "startDate" <= now())
    AND ("endDate" IS NULL OR "endDate" >= now())
  );

CREATE POLICY "Only admins can manage banners" ON "Banner"
  FOR ALL USING (get_my_role() = 'ADMIN')
  WITH CHECK (get_my_role() = 'ADMIN');


-- ============================================================================
-- 10. SONG SUBMISSION TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own submissions" ON "SongSubmission";
DROP POLICY IF EXISTS "Admins and reviewers can view all submissions" ON "SongSubmission";
DROP POLICY IF EXISTS "Authenticated users can create submissions" ON "SongSubmission";
DROP POLICY IF EXISTS "Users can update their own pending submissions" ON "SongSubmission";
DROP POLICY IF EXISTS "Admins and reviewers can update any submission" ON "SongSubmission";
DROP POLICY IF EXISTS "Users can delete their own submissions" ON "SongSubmission";
DROP POLICY IF EXISTS "Admins can delete any submission" ON "SongSubmission";

CREATE POLICY "Users can view their own submissions" ON "SongSubmission"
  FOR SELECT USING ("submitterId" = get_my_user_id());

CREATE POLICY "Admins and reviewers can view all submissions" ON "SongSubmission"
  FOR SELECT USING (get_my_role() IN ('ADMIN', 'REVIEWER'));

CREATE POLICY "Authenticated users can create submissions" ON "SongSubmission"
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND "submitterId" = get_my_user_id()
  );

CREATE POLICY "Users can update their own pending submissions" ON "SongSubmission"
  FOR UPDATE USING (
    "submitterId" = get_my_user_id()
    AND status = 'PENDING'
  )
  WITH CHECK (
    "submitterId" = get_my_user_id()
  );

CREATE POLICY "Admins and reviewers can update any submission" ON "SongSubmission"
  FOR UPDATE USING (get_my_role() IN ('ADMIN', 'REVIEWER'))
  WITH CHECK (get_my_role() IN ('ADMIN', 'REVIEWER'));

CREATE POLICY "Users can delete their own submissions" ON "SongSubmission"
  FOR DELETE USING ("submitterId" = get_my_user_id());

CREATE POLICY "Admins can delete any submission" ON "SongSubmission"
  FOR DELETE USING (get_my_role() = 'ADMIN');


-- ============================================================================
-- 11. STAR/FAVORITE TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage their own starred songs" ON "Star";
DROP POLICY IF EXISTS "Users can manage their own favorites" ON "Favorite";

CREATE POLICY "Users can manage their own starred songs" ON "Star"
  FOR ALL USING ("userId" = get_my_user_id())
  WITH CHECK ("userId" = get_my_user_id());

CREATE POLICY "Users can manage their own favorites" ON "Favorite"
  FOR ALL USING ("userId" = get_my_user_id())
  WITH CHECK ("userId" = get_my_user_id());


-- ============================================================================
-- DONE
-- ============================================================================
-- Core RLS policies configured.
