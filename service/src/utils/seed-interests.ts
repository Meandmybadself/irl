import { prisma } from '../lib/prisma.js';

const interestsData = {
  general_hobbies: [
    '3D printing',
    'Acting',
    'Autograph collecting',
    'Baton twirling',
    'Bonsai',
    'Board/tabletop games',
    'Book discussion clubs',
    'Brazilian jiu-jitsu',
    'Candle making',
    'Coloring',
    'Computer programming',
    'Cooking',
    'Cosplaying',
    'Creative writing',
    'Cryptography',
    'Dance',
    'Digital arts',
    'Do it yourself',
    'Drama',
    'Drawing',
    'Electronics',
    'Embroidery',
    'Flower arranging',
    'Foreign language learning',
    'Genealogy',
    'Glassblowing',
    'Homebrewing',
    'Houseplant care',
    'Hydroponics',
    'Ice skating',
    'Jewelry making',
    'Jigsaw puzzles',
    'Juggling',
    'Kitemaking',
    'Knitting',
    'Lace making',
    'Lapidary',
    'Lego building',
    'Listening to music',
    'Machining',
    'Macrame',
    'Magic',
    'Modeling',
    'Origami',
    'Painting',
    'Playing musical instruments',
    'Pottery',
    'Puzzles',
    'Quilting',
    'Recreational drug use',
    'Scrapbooking',
    'Sculpting',
    'Sewing',
    'Singing',
    'Sketching',
    'Soapmaking',
    'Stand-up comedy',
    'Taxidermy',
    'Video gaming',
    'Watching movies',
    'Wood carving',
    'Woodworking',
    'Worldbuilding',
    'Writing',
    'Yo-yoing',
    'Yoga'
  ],
  outdoor_hobbies: [
    'Air sports',
    'Archery',
    'Astronomy',
    'BASE jumping',
    'Baseball',
    'Basketball',
    'Beekeeping',
    'Birdwatching',
    'BMX',
    'Board sports',
    'Bodybuilding',
    'Dandyism',
    'Dowsing',
    'Driving',
    'Fishing',
    'Flag football',
    'Flying',
    'Foraging',
    'Freestyle football',
    'Gardening',
    'Geocaching',
    'Ghost hunting',
    'Graffiti',
    'Handball',
    'Hiking',
    'Hooping',
    'Hunting',
    'Inline skating',
    'Jogging',
    'Kayaking',
    'Kite flying',
    'Kitesurfing',
    'Lacrosse',
    'LARPing',
    'Letterboxing',
    'Metal detecting',
    'Motor sports',
    'Mountain biking',
    'Mountaineering',
    'Mushroom hunting/mycology',
    'Netball',
    'Nordic skating',
    'Orienteering',
    'Paintball',
    'Parkour',
    'Photography',
    'Polo',
    'Rafting',
    'Rappelling',
    'Rock climbing',
    'Roller skating',
    'Rugby',
    'Running',
    'Sailing',
    'Sand art',
    'Scuba diving',
    'Sculling or rowing',
    'Shooting',
    'Shopping',
    'Skateboarding',
    'Skiing',
    'Skimboarding',
    'Skydiving',
    'Slacklining',
    'Sledding',
    'Snowboarding',
    'Stone skipping',
    'Surfing',
    'Swimming',
    'Taekwondo',
    'Tai chi',
    'Urban exploration',
    'Vehicle restoration',
    'Water sports'
  ],
  collection_hobbies: [
    'Anime figurine collecting',
    'Antiquing',
    'Art collecting',
    'Book collecting',
    'Cartophily (card collecting)',
    'Coin collecting',
    'Comic book collecting',
    'Deltiology (postcard collecting)',
    'Element collecting',
    'Fusilately (phonecard collecting)',
    'Lotology (lottery ticket collecting)',
    'Movie memorabilia collecting',
    'Manga collecting',
    'Notaphily (banknote collecting)',
    'Record collecting',
    'Stamp collecting',
    'Video game collecting',
    'Vintage cars',
    'Antiquities',
    'Auto audiophilia',
    'Flower collecting and pressing',
    'Fossil hunting',
    'Insect collecting',
    'Metal detecting',
    'Mineral collecting',
    'Rock balancing',
    'Sea glass collecting',
    'Seashell collecting',
    'Stone collecting',
    'Animal fancy'
  ],
  sports_hobbies: [
    'Badminton',
    'Baton twirling',
    'Beauty pageants',
    'Billiards',
    'Bowling',
    'Boxing',
    'Bridge',
    'Cheerleading',
    'Chess',
    'Color guard',
    'Curling',
    'Dancing',
    'Darts',
    'Debate',
    'Fencing',
    'Go',
    'Gymnastics',
    'Ice hockey',
    'Ice skating',
    'Judo',
    'Kabaddi',
    'Laser tag',
    'Mahjong',
    'Marbles',
    'Martial arts',
    'Poker',
    'Slot car racing',
    'Table football',
    'Table tennis',
    'Volleyball',
    'Weightlifting',
    'Wrestling',
    'Airsoft',
    'Archery',
    'Association football',
    'Australian rules football',
    'Auto racing',
    'Baseball',
    'Beach volleyball',
    'Breakdancing',
    'Climbing',
    'Cricket',
    'Cycling',
    'Disc golf',
    'Dog sport',
    'Equestrianism',
    'Exhibition drill',
    'Field hockey',
    'Figure skating',
    'Fishing',
    'Footbag',
    'Golfing',
    'Handball',
    'Jukskei',
    'Kart racing',
    'Model aircraft',
    'Racquetball',
    'Radio-controlled car racing',
    'Roller derby',
    'Rugby league football',
    'Shooting sports',
    'Skateboarding',
    'Speed skating',
    'Squash',
    'Surfing',
    'Swimming',
    'Table tennis',
    'Tennis',
    'Tour skating',
    'Triathlon',
    'Ultimate frisbee',
    'Volleyball'
  ],
  observation_and_other: [
    'Audiophile',
    'Microscopy',
    'Reading',
    'Shortwave listening',
    'Aircraft spotting',
    'Amateur astronomy',
    'Birdwatching',
    'Bus spotting',
    'Geocaching',
    'Gongoozling',
    'Herping',
    'Meteorology',
    'Trainspotting'
  ]
};

export const seedInterests = async () => {
  console.log('Starting interests seed...');

  const allInterests: Array<{ name: string; category: string }> = [];

  for (const [category, interests] of Object.entries(interestsData)) {
    for (const name of interests) {
      allInterests.push({ name, category });
    }
  }

  let created = 0;
  let skipped = 0;

  for (const interest of allInterests) {
    const existing = await prisma.interest.findFirst({
      where: {
        name: interest.name,
        category: interest.category,
        deleted: false
      }
    });

    if (!existing) {
      await prisma.interest.create({
        data: interest
      });
      created++;
    } else {
      skipped++;
    }
  }

  console.log(`Interests seed complete: ${created} created, ${skipped} skipped`);
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedInterests()
    .then(() => {
      console.log('Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}




