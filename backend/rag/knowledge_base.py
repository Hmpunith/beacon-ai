"""
RAG Knowledge Base — Educational content retrieval using ChromaDB.
"""

import chromadb
from chromadb.config import Settings


# Curated educational content for K-12
EDUCATION_CONTENT = [
    # Mathematics
    {"text": "Algebra basics: Variables represent unknown values. An equation like 2x + 3 = 7 can be solved by isolating x. Subtract 3 from both sides: 2x = 4. Divide by 2: x = 2.", "subject": "Mathematics", "topic": "Algebra", "grade": "7-9"},
    {"text": "The Pythagorean theorem states that in a right triangle, a² + b² = c², where c is the hypotenuse. For example, a triangle with sides 3 and 4 has hypotenuse 5, since 9 + 16 = 25.", "subject": "Mathematics", "topic": "Geometry", "grade": "8-10"},
    {"text": "Fractions: To add fractions with different denominators, find the LCD. Example: 1/3 + 1/4 = 4/12 + 3/12 = 7/12. To multiply fractions, multiply numerators and denominators: 2/3 × 3/4 = 6/12 = 1/2.", "subject": "Mathematics", "topic": "Fractions", "grade": "5-7"},
    {"text": "Linear equations represent straight lines on a graph. The slope-intercept form is y = mx + b, where m is the slope (rise/run) and b is the y-intercept. A positive slope goes up-right, negative goes down-right.", "subject": "Mathematics", "topic": "Linear Equations", "grade": "8-10"},
    {"text": "Percentages: To find 25% of 80, convert to decimal (0.25) and multiply: 0.25 × 80 = 20. To convert a fraction to percentage, divide and multiply by 100: 3/4 = 0.75 = 75%.", "subject": "Mathematics", "topic": "Percentages", "grade": "6-8"},
    {"text": "Quadratic equations have the form ax² + bx + c = 0. The quadratic formula x = (-b ± √(b²-4ac)) / 2a gives the solutions. The discriminant b²-4ac determines: positive = 2 real solutions, zero = 1, negative = no real solutions.", "subject": "Mathematics", "topic": "Quadratics", "grade": "9-11"},
    {"text": "Order of operations (PEMDAS/BODMAS): Parentheses first, then Exponents, then Multiplication/Division (left to right), then Addition/Subtraction (left to right). Example: 2 + 3 × 4 = 2 + 12 = 14, NOT 20.", "subject": "Mathematics", "topic": "Order of Operations", "grade": "5-7"},
    {"text": "Probability measures how likely an event is to occur, from 0 (impossible) to 1 (certain). For a fair die, P(rolling 3) = 1/6. For two independent events, P(A and B) = P(A) × P(B).", "subject": "Mathematics", "topic": "Probability", "grade": "7-9"},

    # Science
    {"text": "Photosynthesis: Plants convert sunlight, water (H₂O), and carbon dioxide (CO₂) into glucose (C₆H₁₂O₆) and oxygen (O₂). The equation: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂. This occurs in chloroplasts using chlorophyll.", "subject": "Science", "topic": "Biology", "grade": "6-9"},
    {"text": "Newton's Three Laws: 1) An object stays at rest or in motion unless acted on by a force. 2) F = ma (force equals mass times acceleration). 3) Every action has an equal and opposite reaction.", "subject": "Science", "topic": "Physics", "grade": "8-10"},
    {"text": "The water cycle: Evaporation (water→vapor), Condensation (vapor→clouds), Precipitation (rain/snow), Collection (in rivers/oceans). Solar energy drives evaporation, gravity drives precipitation.", "subject": "Science", "topic": "Earth Science", "grade": "5-7"},
    {"text": "Atoms consist of protons (positive, in nucleus), neutrons (neutral, in nucleus), and electrons (negative, orbiting). The atomic number = number of protons. Elements are arranged in the periodic table by atomic number.", "subject": "Science", "topic": "Chemistry", "grade": "7-9"},
    {"text": "Cell structure: All living things are made of cells. Animal cells have a cell membrane, nucleus, cytoplasm, mitochondria, and ribosomes. Plant cells additionally have a cell wall, chloroplasts, and a large vacuole.", "subject": "Science", "topic": "Biology", "grade": "6-8"},
    {"text": "Electricity: Current (I) is the flow of electrons measured in amperes. Voltage (V) is the push that drives current. Resistance (R) opposes current flow. Ohm's Law: V = I × R.", "subject": "Science", "topic": "Physics", "grade": "8-10"},
    {"text": "The solar system has 8 planets orbiting the Sun: Mercury, Venus, Earth, Mars (rocky/inner), Jupiter, Saturn, Uranus, Neptune (gas/ice giants). Earth is the only known planet with liquid water and life.", "subject": "Science", "topic": "Astronomy", "grade": "5-7"},
    {"text": "DNA (deoxyribonucleic acid) carries genetic information in all living organisms. It has a double helix structure with base pairs: Adenine-Thymine, Guanine-Cytosine. Genes are segments of DNA that code for proteins.", "subject": "Science", "topic": "Genetics", "grade": "9-11"},

    # English
    {"text": "Parts of speech: Nouns (person/place/thing), Verbs (action/state), Adjectives (describe nouns), Adverbs (describe verbs), Pronouns (replace nouns), Prepositions (show relationships), Conjunctions (connect), Interjections (express emotion).", "subject": "English", "topic": "Grammar", "grade": "5-8"},
    {"text": "Essay structure: Introduction (hook + thesis), Body paragraphs (topic sentence + evidence + analysis), Conclusion (restate thesis + broader implications). Each paragraph should focus on one main idea.", "subject": "English", "topic": "Writing", "grade": "7-10"},
    {"text": "Literary devices: Metaphor (direct comparison), Simile (comparison using like/as), Personification (giving human traits to non-human), Alliteration (repeating initial sounds), Hyperbole (exaggeration for effect).", "subject": "English", "topic": "Literature", "grade": "7-10"},
    {"text": "Reading comprehension strategies: Preview the text, identify the main idea, look for supporting details, make inferences, summarize in your own words, connect to prior knowledge, ask questions while reading.", "subject": "English", "topic": "Reading", "grade": "5-8"},

    # History
    {"text": "The Industrial Revolution (1760-1840) transformed manufacturing from hand production to machines. Key inventions: steam engine (Watt), spinning jenny (Hargreaves), power loom. It started in Britain and spread globally, changing society forever.", "subject": "History", "topic": "Industrial Revolution", "grade": "8-10"},
    {"text": "World War II (1939-1945): Caused by aggressive expansion of Nazi Germany, Fascist Italy, and Imperial Japan. Key events: invasion of Poland, Battle of Britain, Pearl Harbor, D-Day, atomic bombs on Hiroshima and Nagasaki. Result: UN formed, Cold War began.", "subject": "History", "topic": "World War II", "grade": "9-11"},
    {"text": "Ancient civilizations: Mesopotamia (3500 BCE, writing), Egypt (pyramids, Nile), Indus Valley (urban planning), China (Great Wall, silk). These civilizations developed agriculture, writing, government, and trade independently.", "subject": "History", "topic": "Ancient Civilizations", "grade": "6-8"},
    {"text": "The French Revolution (1789-1799): Caused by inequality, debt, and famine. Key events: Storming of the Bastille, Declaration of Rights of Man, Reign of Terror, rise of Napoleon. It ended absolute monarchy and spread democratic ideals.", "subject": "History", "topic": "French Revolution", "grade": "9-11"},
]


class KnowledgeBase:
    def __init__(self):
        self.client = None
        self.collection = None

    async def initialize(self):
        """Initialize ChromaDB and load educational content."""
        try:
            self.client = chromadb.Client(Settings(anonymized_telemetry=False))
            self.collection = self.client.get_or_create_collection(
                name="beacon_education",
                metadata={"description": "K-12 educational content for Beacon AI"},
            )

            # Only add if collection is empty
            if self.collection.count() == 0:
                print("[RAG] Loading educational content into knowledge base...")
                ids = []
                documents = []
                metadatas = []
                for i, item in enumerate(EDUCATION_CONTENT):
                    ids.append(f"edu_{i}")
                    documents.append(item["text"])
                    metadatas.append({
                        "subject": item["subject"],
                        "topic": item["topic"],
                        "grade": item["grade"],
                    })

                self.collection.add(ids=ids, documents=documents, metadatas=metadatas)
                print(f"[RAG] Loaded {len(ids)} educational documents.")
            else:
                print(f"[RAG] Knowledge base already has {self.collection.count()} documents.")

        except Exception as e:
            print(f"[RAG] Knowledge base initialization error: {e}")

    def search(self, query: str, subject: str = None, n_results: int = 3) -> list[str]:
        """Search the knowledge base for relevant content."""
        if not self.collection:
            return []

        try:
            where = {"subject": subject} if subject and subject != "General" else None
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where,
            )
            return results["documents"][0] if results["documents"] else []
        except Exception as e:
            print(f"[RAG] Search error: {e}")
            return []
