import axios from 'axios';

class TestmailService {
  constructor() {
    this.baseUrl = 'https://api.testmail.app/api/json';
  }

  // Lazy load configuration
  getConfig() {
    return {
      apiKey: process.env.TESTMAIL_API_KEY,
      namespace: process.env.TESTMAIL_NAMESPACE,
      tag: process.env.TESTMAIL_TAG || 'test'
    };
  }

  // Get authorization headers
  getHeaders() {
    const { apiKey } = this.getConfig();
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  // Get the testmail inbox address
  getInboxAddress(customTag = null) {
    const { namespace, tag } = this.getConfig();
    const tagToUse = customTag || tag;
    return `${namespace}.${tagToUse}@inbox.testmail.app`;
  }

  // Get all emails from inbox
  async getEmails(tag = null, limit = 50) {
    try {
      const { apiKey, namespace, tag: defaultTag } = this.getConfig();
      const tagToUse = tag || defaultTag;
      
      const response = await axios.get(
        `${this.baseUrl}?apikey=${apiKey}&namespace=${namespace}&tag=${tagToUse}&livequery=true`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        emails: response.data.emails || [],
        count: response.data.count || 0
      };
    } catch (error) {
      console.error('Error fetching emails from testmail.app:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        emails: [],
        count: 0
      };
    }
  }

  // Get a specific email by ID
  async getEmailById(emailId) {
    try {
      const emails = await this.getEmails();
      if (emails.success) {
        const email = emails.emails.find(e => e.id === emailId || e._id === emailId);
        return {
          success: true,
          email: email || null
        };
      }
      return {
        success: false,
        error: 'Failed to fetch emails'
      };
    } catch (error) {
      console.error('Error fetching email by ID:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get the latest email
  async getLatestEmail(tag = null) {
    try {
      const result = await this.getEmails(tag, 1);
      if (result.success && result.emails.length > 0) {
        return {
          success: true,
          email: result.emails[0]
        };
      }
      return {
        success: false,
        error: 'No emails found'
      };
    } catch (error) {
      console.error('Error fetching latest email:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Search emails by subject
  async searchBySubject(subject, tag = null) {
    try {
      const result = await this.getEmails(tag);
      if (result.success) {
        const matchingEmails = result.emails.filter(email => 
          email.subject && email.subject.toLowerCase().includes(subject.toLowerCase())
        );
        return {
          success: true,
          emails: matchingEmails,
          count: matchingEmails.length
        };
      }
      return result;
    } catch (error) {
      console.error('Error searching emails:', error.message);
      return {
        success: false,
        error: error.message,
        emails: [],
        count: 0
      };
    }
  }

  // Delete all emails from inbox
  async deleteAllEmails(tag = null) {
    try {
      const { apiKey, namespace, tag: defaultTag } = this.getConfig();
      const tagToUse = tag || defaultTag;
      await axios.delete(
        `${this.baseUrl}?apikey=${apiKey}&namespace=${namespace}&tag=${tagToUse}`,
        { headers: this.getHeaders() }
      );
      return {
        success: true,
        message: 'All emails deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting emails:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Check if an email with specific subject was received
  async waitForEmail(subject, timeoutMs = 30000, pollIntervalMs = 2000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const result = await this.searchBySubject(subject);
      
      if (result.success && result.emails.length > 0) {
        return {
          success: true,
          email: result.emails[0],
          message: 'Email received'
        };
      }
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    
    return {
      success: false,
      error: 'Timeout: Email not received within the specified time',
      message: 'Email not found'
    };
  }

  // Get email HTML content
  async getEmailHtml(emailId) {
    try {
      const result = await this.getEmailById(emailId);
      if (result.success && result.email) {
        return {
          success: true,
          html: result.email.html || result.email.text || ''
        };
      }
      return {
        success: false,
        error: 'Email not found'
      };
    } catch (error) {
      console.error('Error fetching email HTML:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // View emails in the testmail.app web interface
  getWebViewUrl(tag = null) {
    const { namespace, tag: defaultTag } = this.getConfig();
    const tagToUse = tag || defaultTag;
    return `https://testmail.app/inbox/${namespace}.${tagToUse}@inbox.testmail.app`;
  }
}

// Export singleton instance
export default new TestmailService();
