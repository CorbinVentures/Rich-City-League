import type { PublicNews } from '@/lib/public-data';

export type FeatureInterview = {
  kicker: string;
  pullQuote: string;
  photos: Array<{
    src: string;
    alt: string;
    caption: string;
  }>;
  questions: Array<{
    question: string;
    answer: string;
  }>;
};

const publishedAt = '2026-11-12T16:00:00.000Z';

export const founderInterview = {
  id: 'rch-founder-interview-2026',
  author_id: null,
  title: '“The Bigger Picture Is Unity”: De’Vaughn Corbin on Building a Home for Virginia Hoops',
  slug: 'de-vaughn-corbin-rich-city-hoops-virginia-basketball-interview',
  excerpt: 'After building Rich City League from the ground up, De’Vaughn Corbin is opening a free, statewide basketball platform designed to connect players, organizers and the next generation of builders.',
  body: [
    'Rich City League began in 2011 with De’Vaughn Corbin learning, in real time, what it takes to build a basketball organization from the ground up. Finding players, gyms and referees took persistence—and often meant creating resources that did not yet exist. Today, Corbin is applying those lessons to a broader vision: make it easier for Virginia’s basketball community to find one another and grow.',
    'Rich City Hoops is designed as a shared home for the game. Players can discover leagues, tournaments, trainers, pickup runs, highlights and upcoming events. Organizations can connect with players and use tools that support their promotion and operations.',
    'At the center of the launch is RCH Runs, a free pickup-game platform open across Virginia. It can organize a familiar game at a local park or gym, then keep results, stats, badges and XP connected to the players who took part. Rich City League is a partner in the wider ecosystem, but players do not need to join the league to use Runs.',
  ].join('\n\n'),
  cover_image_url: '/images/news/virginia-basketball-playbook-de-vaughn-corbin.webp',
  status: 'published',
  published_at: publishedAt,
  created_at: publishedAt,
  updated_at: publishedAt,
  category: 'rich-city-league',
  is_automated: false,
  source_urls: [],
  source_names: [],
  seo_title: 'De’Vaughn Corbin on Rich City Hoops and Virginia Basketball | RCH',
  seo_description: 'An in-depth interview with Rich City Hoops founder De’Vaughn Corbin on RCH Runs, Rich City League, free tools for organizers and his vision for uniting Virginia basketball.',
  seo_keywords: ['Rich City Hoops', 'De’Vaughn Corbin', 'Virginia basketball', 'Rich City League', 'RCH Runs', 'pickup basketball Virginia'],
  feature_interview: {
    kicker: 'THE RCH INTERVIEW · THE BUILDER’S BLUEPRINT',
    pullQuote: '“I don’t want to see my brothers struggle the same way I did to grow my organization.”',
    photos: [
      {
        src: '/images/news/de-vaughn-corbin-community-outdoor.webp',
        alt: 'De’Vaughn Corbin shares a smile with a companion at an outdoor gathering.',
        caption: 'For Corbin, the work has always been about the people who make the game a community.',
      },
      {
        src: '/images/news/de-vaughn-corbin-basketball-event.webp',
        alt: 'De’Vaughn Corbin and a companion at a basketball event with spectators in the stands.',
        caption: 'The vision reaches beyond one gym, connecting players and organizers across Virginia.',
      },
    ],
    questions: [
      {
        question: 'For someone hearing about Rich City Hoops for the first time, what is the platform?',
        answer: 'Rich City Hoops is a basketball community where players can find what they need around the game—leagues, tournaments, trainers, pickup runs, highlights and upcoming events. Organizations can use it to reach players and grow what they are building. The goal is to make the basketball scene easier to discover and easier to be part of.',
      },
      {
        question: 'You started Rich City League in 2011. What did that experience teach you?',
        answer: 'I know how hard it is to build an organization from the ground up. We had to find players, gyms, referees and the resources to keep moving. There just were not enough resources out there, so we created a lot of them for ourselves. I don’t want to see my brothers struggle the same way I did to grow their organizations. Rich City Hoops is about giving the generations coming behind us more guidance and a stronger starting point.',
      },
      {
        question: 'Is Rich City Hoops only for people who play in Rich City League?',
        answer: 'No. Rich City League is a partner of Rich City Hoops, but RCH Runs is open to everyone, free of charge. You do not have to play for our league. If you have a favorite park or local gym where you normally hoop, you can use the platform to bring your people together there.',
      },
      {
        question: 'Walk us through how a Run works, from the first tap to the final score.',
        answer: 'Start by getting your friends on the platform, then host a Run. A Run is a pickup game, but it gives the group more structure. Choose social play or a competitive run, pick the location, add a title and set the date, time and other details. Once the Run is created, you enter the open Run room and can generate a QR code for friends to check in and join the lobby. From there, set the teams, start the live game, track the score and stats, then finalize the result for team confirmation.',
      },
      {
        question: 'What happens after the game is finalized?',
        answer: 'Once the results are finalized and published, participants receive badges and XP on their profiles. That progression follows them as they keep playing. Every game can become part of a player’s longer story on the platform.',
      },
      {
        question: 'The platform is open statewide. What does bringing Virginia together look like to you?',
        answer: 'It means a player can be in one city and still know what is happening with hoopers in another city—following them, engaging with them and building relationships through basketball. The platform is open across Virginia, so you can start with the park or gym you already know and connect from there.',
      },
      {
        question: 'Tell us about Runs Crews and the territory feature.',
        answer: 'Runs Crews are for you and the guys you usually run with. Your crew can claim a home court, take over territory and have other groups challenge you. It gives friend groups a reason to stay active and creates a fun way for the community to grow from court to court.',
      },
      {
        question: 'What does it cost to join?',
        answer: 'It is completely free. Users just sign up on the platform—no card and no long, detailed intake process. The focus right now is getting people in, letting them try it and helping the community grow.',
      },
      {
        question: 'How can leagues, tournaments and other basketball organizations benefit?',
        answer: 'They can use free resources like the website builder and scorebook, while getting help with outreach. Rich City Hoops brings enhanced search visibility together with the network we have built through Rich City League. Corbin says that network can help an organization’s promotion reach more than 40,000 views across social media, depending on the campaign and distribution.',
      },
      {
        question: 'What would you tell a player or organization deciding whether to try it?',
        answer: 'Test it out. I’m more than sure it will boost your hooping experience. Players can register, bring their friends over and organize the games they already play. Organizations can sign up and explore the website builder, scorebook and promotion resources. We want early users to help bring their people into the community.',
      },
    ],
  } satisfies FeatureInterview,
} as unknown as PublicNews;
