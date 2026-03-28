/**
 * ROLLBACK SCRIPT: Content Cleanup Reversal
 *
 * PURPOSE:
 * This script restores the original document content (with Agent questions)
 * that was removed during the content cleanup operation.
 *
 * BACKUP TABLE: documents_content_backup
 * CLEANUP DATE: November 15, 2025
 * DOCUMENTS AFFECTED: 54 total (all documents in the table)
 *
 * WHAT WAS REMOVED:
 * - All "Agent:" conversational questions
 * - Kept only "Utilisateur:" (User) responses
 *
 * EXAMPLE OF RESTORATION:
 * BEFORE CLEANUP (original):
 *   "Agent: Félicitations pour ta certification Professional Scrum Master I..."
 *   "Utilisateur: En 2022, j'ai eu ma certification Professional Scrum Master I..."
 *
 * AFTER CLEANUP:
 *   "En 2022, j'ai eu ma certification Professional Scrum Master I..."
 *
 * THIS SCRIPT WILL RESTORE TO:
 *   "Agent: Félicitations pour ta certification Professional Scrum Master I..."
 *   "Utilisateur: En 2022, j'ai eu ma certification Professional Scrum Master I..."
 */

-- ============================================================================
-- STEP 1: VERIFY BACKUP TABLE EXISTS AND HAS DATA
-- ============================================================================
-- Run this first to confirm the backup table is available
SELECT COUNT(*) as backup_count,
       COUNT(DISTINCT id) as unique_ids
FROM documents_content_backup;

-- Expected result: 54 backup records
-- If result is 0, the backup table has been dropped and restoration is not possible


-- ============================================================================
-- STEP 2: BACKUP CURRENT CLEANED CONTENT (OPTIONAL SAFETY MEASURE)
-- ============================================================================
-- If you want to save the cleaned version before reverting, run:
CREATE TABLE IF NOT EXISTS documents_content_cleaned_backup AS
SELECT id, content FROM documents;

-- Verify the backup
SELECT COUNT(*) FROM documents_content_cleaned_backup;


-- ============================================================================
-- STEP 3: RESTORE ORIGINAL CONTENT FROM BACKUP
-- ============================================================================
-- This is the main rollback operation
UPDATE documents d
SET content = b.content
FROM documents_content_backup b
WHERE d.id = b.id;

-- Verify the update was successful
SELECT COUNT(*) as documents_restored
FROM documents
WHERE content LIKE '%Agent:%';

-- Expected result: 54 (all documents should now contain Agent questions again)


-- ============================================================================
-- STEP 4: VERIFY RESTORATION QUALITY
-- ============================================================================
-- Check a sample of restored documents to ensure content looks correct
SELECT id,
       SUBSTRING(content FROM 1 FOR 100) as content_preview,
       CASE
         WHEN content LIKE '%Agent:%' THEN 'Has Agent Questions ✓'
         ELSE 'Missing Agent Questions ✗'
       END as restoration_status
FROM documents
ORDER BY id
LIMIT 5;

-- Show statistics
SELECT
  COUNT(*) as total_documents,
  COUNT(CASE WHEN content LIKE '%Agent:%' THEN 1 END) as with_agent_questions,
  COUNT(CASE WHEN content LIKE '%Utilisateur:%' THEN 1 END) as with_user_responses
FROM documents;


-- ============================================================================
-- STEP 5: DROP BACKUP TABLES (CLEANUP)
-- ============================================================================
-- Only run this after you've confirmed restoration is successful
-- and you're confident you won't need to rollback again

-- Drop the original backup used for restoration
DROP TABLE IF EXISTS documents_content_backup;

-- Drop the cleaned backup if you created it in STEP 2
DROP TABLE IF EXISTS documents_content_cleaned_backup;

-- Verify cleanup
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'documents%backup';


-- ============================================================================
-- TROUBLESHOOTING GUIDE
-- ============================================================================

/*
ISSUE: "documents_content_backup" table not found
SOLUTION: The backup table may have been dropped. If this happened:
  - Option 1: Check if documents_content_cleaned_backup exists instead
  - Option 2: Restoration is not possible; content cleanup cannot be reversed
  - Option 3: Contact support with the backup from before the cleanup

ISSUE: Restoration completed but content looks wrong
SOLUTION:
  - Run STEP 4 to verify a few sample documents
  - Check if the original backup was correct before cleanup
  - Some documents may have had corrupted data in the backup

ISSUE: Only partial documents restored
SOLUTION:
  - Check if the backup table has all 54 records
  - Run: SELECT COUNT(*) FROM documents_content_backup;
  - If less than 54, the backup itself is incomplete

ISSUE: Need to revert to cleaned version after restoration
SOLUTION:
  - If you saved documents_content_cleaned_backup in STEP 2:
    UPDATE documents d
    SET content = b.content
    FROM documents_content_cleaned_backup b
    WHERE d.id = b.id;
*/


-- ============================================================================
-- QUICK REFERENCE: Steps to Execute
-- ============================================================================
/*
1. Connect to your Supabase PostgreSQL database
2. Copy this entire script or run sections sequentially
3. RECOMMENDED SEQUENCE:
   a. Run STEP 1 (Verify backup exists)
   b. Run STEP 2 (Create safety backup of cleaned data)
   c. Run STEP 3 (Restore original content)
   d. Run STEP 4 (Verify restoration quality)
   e. Run STEP 5 (Cleanup backup tables) - ONLY WHEN CONFIDENT

4. If anything looks wrong, STOP and check TROUBLESHOOTING GUIDE
5. Test your RAG search with restored content to ensure it works as expected
*/
