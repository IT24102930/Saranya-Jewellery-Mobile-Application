import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectionDB } from './config/db.js';
import LoyaltyTier from './models/LoyaltyTier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function seedLoyaltyTiers() {
  try {
    await connectionDB();
    
    // Check if tiers already exist
    const existingTiers = await LoyaltyTier.countDocuments();
    if (existingTiers > 0) {
      console.log('Loyalty tiers already initialized');
      process.exit(0);
    }

    // Create default tiers
    const tiers = [
      {
        tierName: 'Silver',
        minSpent: 0,
        maxSpent: 50000,
        pointMultiplier: 1,
        benefits: [
          '1 point per Rs. 100 spent',
          'Birthday discount',
          'Priority support'
        ],
        description: 'Entry-level loyalty program with basic benefits'
      },
      {
        tierName: 'Gold',
        minSpent: 50000,
        maxSpent: 200000,
        pointMultiplier: 1.5,
        benefits: [
          '1.5 points per Rs. 100 spent',
          'Exclusive previews of new collections',
          'Free cleaning service (twice per year)',
          '10% discount on repairs'
        ],
        description: 'Premium loyalty program with exclusive benefits'
      },
      {
        tierName: 'Platinum',
        minSpent: 200000,
        maxSpent: Infinity,
        pointMultiplier: 2,
        benefits: [
          '2 points per Rs. 100 spent',
          'VIP events access and invitations',
          'Personal shopper assistance',
          '15% discount on all repairs',
          'Complimentary gift wrapping',
          'Priority access to limited editions'
        ],
        description: 'Elite loyalty program with premium VIP benefits'
      }
    ];

    await LoyaltyTier.insertMany(tiers);
    console.log('Loyalty tiers seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding loyalty tiers:', error);
    process.exit(1);
  }
}

seedLoyaltyTiers();
