import express from 'express';
import emailService from '../utils/emailService.js';
import testmailService from '../utils/testmailService.js';

const router = express.Router();

// Send a test email to testmail.app
router.post('/send-test', async (req, res) => {
  try {
    const { tag, subject, content } = req.body;
    
    const result = await emailService.sendTestEmail(
      tag || 'test',
      subject || '🧪 Test Email from Saranya Jewellery',
      content || '<h1>This is a test email</h1><p>Testing email integration with testmail.app</p>'
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all emails from testmail inbox
router.get('/inbox', async (req, res) => {
  try {
    const { tag, limit } = req.query;
    const result = await testmailService.getEmails(tag, limit ? parseInt(limit) : 50);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get latest email from testmail inbox
router.get('/latest', async (req, res) => {
  try {
    const { tag } = req.query;
    const result = await testmailService.getLatestEmail(tag);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Search emails by subject
router.get('/search', async (req, res) => {
  try {
    const { subject, tag } = req.query;
    
    if (!subject) {
      return res.status(400).json({ 
        success: false, 
        error: 'Subject parameter is required' 
      });
    }

    const result = await testmailService.searchBySubject(subject, tag);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete all emails from testmail inbox
router.delete('/inbox', async (req, res) => {
  try {
    const { tag } = req.query;
    const result = await testmailService.deleteAllEmails(tag);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get testmail web view URL
router.get('/web-view', async (req, res) => {
  try {
    const { tag } = req.query;
    const url = testmailService.getWebViewUrl(tag);
    res.json({ 
      success: true, 
      url,
      message: 'Open this URL in your browser to view the inbox'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Enable/disable test mode
router.post('/test-mode', async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        error: 'enabled parameter must be a boolean' 
      });
    }

    emailService.setTestMode(enabled);
    res.json({ 
      success: true, 
      testMode: enabled,
      message: `Test mode ${enabled ? 'enabled' : 'disabled'}. All emails will ${enabled ? 'now' : 'no longer'} be sent to testmail.app inbox.`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get testmail configuration
router.get('/config', async (req, res) => {
  try {
    const namespace = process.env.TESTMAIL_NAMESPACE;
    const tag = process.env.TESTMAIL_TAG || 'test';
    const inboxAddress = testmailService.getInboxAddress();
    const webViewUrl = testmailService.getWebViewUrl();

    res.json({
      success: true,
      config: {
        namespace,
        defaultTag: tag,
        inboxAddress,
        webViewUrl
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
