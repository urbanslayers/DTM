// Define the schema directly
const variablesSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SMSVariables",
  "type": "object",
  "properties": {
    "first_name": { "type": "string" },
    "last_name": { "type": "string" },
    "full_name": { "type": "string" },
    "email": { "type": "string", "format": "email" },
    "phone_number": { "type": "string" },
    "country": { "type": "string" },
    "city": { "type": "string" },
    "postcode": { "type": "string" },
    "timezone": { "type": "string" },
    "language": { "type": "string" },
    "loyalty_tier": { "type": "string" },
    "points_balance": { "type": "integer" },
    "dob": { "type": "string", "format": "date" },
    "company_name": { "type": "string" },
    "support_number": { "type": "string" },
    "order_id": { "type": "string" },
    "product_name": { "type": "string" },
    "total_price": { "type": "string" },
    "payment_status": { "type": "string" },
    "appointment_date": { "type": "string", "format": "date-time" },
    "appointment_time": { "type": "string" },
    "tracking_number": { "type": "string" },
    "cta_link": { "type": "string", "format": "uri" },
    "offer_code": { "type": "string" },
    "offer_expiry": { "type": "string", "format": "date" },
    "alert_type": { "type": "string" },
    "alert_level": { "type": "string" },
    "custom_fields": { "type": "object" }
  },
  "required": ["phone_number", "first_name", "company_name"]
};

export class VariableProcessor {
  private systemVariables: Map<string, any>;

  constructor() {
    this.systemVariables = new Map();
    this.initSystemVariables();
  }

  private initSystemVariables() {
    // Add system variables that are always available
    this.systemVariables.set('current_date', () => new Date().toLocaleDateString());
    this.systemVariables.set('current_time', () => new Date().toLocaleTimeString());
    this.systemVariables.set('current_year', () => new Date().getFullYear());
    this.systemVariables.set('random_id', () => Math.random().toString(36).substr(2, 9));
  }

  /**
   * Process a template string and replace variables with their values
   */
  async processTemplate(
    template: string,
    userData: any,
    campaignData?: any,
    customVariables?: Record<string, any>
  ): Promise<string> {
    let processedTemplate = template;

    // Replace user variables
    if (userData) {
      processedTemplate = this.replaceUserVariables(processedTemplate, userData);
    }

    // Replace campaign variables
    if (campaignData) {
      processedTemplate = this.replaceCampaignVariables(processedTemplate, campaignData);
    }

    // Replace system variables
    processedTemplate = this.replaceSystemVariables(processedTemplate);

    // Replace custom variables
    if (customVariables) {
      processedTemplate = this.replaceCustomVariables(processedTemplate, customVariables);
    }

    return processedTemplate;
  }

  /**
   * Replace user-related variables in the template
   */
  private replaceUserVariables(template: string, userData: any): string {
    const userVariables = {
      first_name: userData.firstName || '',
      last_name: userData.lastName || '',
      full_name: userData.fullName || userData.displayName || '',
      email: userData.email || '',
      phone_number: userData.personalMobile || '',
      country: userData.country || '',
      city: userData.city || '',
      postcode: userData.postcode || '',
      timezone: userData.timezone || '',
      language: userData.language || '',
      loyalty_tier: userData.loyaltyTier || '',
      points_balance: userData.pointsBalance || 0,
      dob: userData.dateOfBirth ? new Date(userData.dateOfBirth).toLocaleDateString() : '',
    };

    return this.replaceVariables(template, userVariables);
  }

  /**
   * Replace campaign-related variables in the template
   */
  private replaceCampaignVariables(template: string, campaignData: any): string {
    if (!campaignData.variables) return template;
    return this.replaceVariables(template, campaignData.variables);
  }

  /**
   * Replace system variables in the template
   */
  private replaceSystemVariables(template: string): string {
    let result = template;
    
    this.systemVariables.forEach((valueFn, key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, valueFn());
    });

    return result;
  }

  /**
   * Replace custom variables in the template
   */
  private replaceCustomVariables(template: string, customVariables: Record<string, any>): string {
    return this.replaceVariables(template, customVariables);
  }

  /**
   * Generic variable replacement function
   */
  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    });

    return result;
  }

  /**
   * Validate if a template uses only allowed variables
   */
  validateTemplate(template: string): { isValid: boolean; unknownVariables: string[] } {
    const variableRegex = /{{([^}]+)}}/g;
    const matches = template.match(variableRegex) || [];
    const variables = matches.map(match => match.slice(2, -2));
    
    const allowedVariables = new Set([
      ...Object.keys(variablesSchema.properties),
      ...Array.from(this.systemVariables.keys())
    ]);

    const unknownVariables = variables.filter(v => !allowedVariables.has(v));
    
    return {
      isValid: unknownVariables.length === 0,
      unknownVariables
    };
  }

  /**
   * Get a list of all available variables
   */
  getAvailableVariables(): Record<string, any> {
    return {
      user: Object.keys(variablesSchema.properties),
      system: Array.from(this.systemVariables.keys()),
    };
  }
}

// Export a singleton instance
export const variableProcessor = new VariableProcessor();