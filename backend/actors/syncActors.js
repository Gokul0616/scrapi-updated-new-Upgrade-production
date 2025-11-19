const Actor = require('../models/Actor');
const { actorRegistry } = require('./registry');

/**
 * Auto-sync actors from registry to database
 * Called on backend startup
 */
async function syncActors() {
  try {
    console.log('🔄 Syncing actors from registry...');
    
    let created = 0;
    let updated = 0;
    
    for (const actorData of actorRegistry) {
      // Remove scraperFunction before saving to DB
      const { scraperFunction, ...actorInfo } = actorData;
      
      // Check if actor exists
      const existingActor = await Actor.findOne({ actorId: actorInfo.actorId });
      
      if (existingActor) {
        // Update existing actor (preserve userId if set)
        await Actor.updateOne(
          { actorId: actorInfo.actorId },
          { 
            $set: {
              name: actorInfo.name,
              title: actorInfo.title,
              description: actorInfo.description,
              author: actorInfo.author,
              slug: actorInfo.slug,
              category: actorInfo.category,
              icon: actorInfo.icon,
              pricingModel: actorInfo.pricingModel,
              isPublic: actorInfo.isPublic,
              inputFields: actorInfo.inputFields,
              outputFields: actorInfo.outputFields,
              'stats.rating': actorInfo.stats.rating,
              'stats.reviews': actorInfo.stats.reviews,
              updatedAt: new Date()
            }
          }
        );
        updated++;
      } else {
        // Create new actor
        const newActor = new Actor({
          ...actorInfo,
          userId: null, // Public actors have no owner
          isBookmarked: false,
          inputFields: actorInfo.inputFields,
          outputFields: actorInfo.outputFields,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        await newActor.save();
        created++;
      }
    }
    
    console.log(`✅ Actor sync complete: ${created} created, ${updated} updated`);
  } catch (error) {
    console.error('❌ Error syncing actors:', error);
    throw error;
  }
}

module.exports = syncActors;
