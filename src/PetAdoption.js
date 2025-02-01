import { useState, useEffect } from "react";
import "./App.css";

export default function PetAdoption() {
  const [adoptedPets, setAdoptedPets] = useState({});
  const [showForm, setShowForm] = useState({});
  const [adopteeName, setAdopteeName] = useState("");
  const [userIp, setUserIp] = useState("");
  const [pets, setPets] = useState([]);
  const [pageTitle, setPageTitle] = useState("");
  const [pageDescription, setPageDescription] = useState("");
  const [websiteTitle, setWebsiteTitle] = useState("");

  // Fetch user IP address
  useEffect(() => {
    fetch("http://localhost:5000/get-ip")
      .then((response) => response.json())
      .then((data) => setUserIp(data.ip))
      .catch((error) => console.error("Error fetching IP:", error));

    // Fetch current adoption status
    fetch("http://localhost:5000/pets")
      .then(res => res.json())
      .then(data => {
        const adopted = {};
        data.forEach(pet => {
          if (pet.adopted_by) {
            adopted[pet.id] = pet.adopted_by;
          }
        });
        setAdoptedPets(adopted);
        setPets(data);
      })
      .catch((error) => console.error("Error fetching adoption status:", error));

    // Fetch page details
    fetch("http://localhost:5000/page-details")
      .then((response) => response.json())
      .then((data) => {
        setPageTitle(data.title);
        setPageDescription(data.description);
      })
      .catch((error) => console.error("Error fetching page details:", error));

    // Fetch website title
    fetch("http://localhost:5000/website-title")
      .then((response) => response.json())
      .then((data) => {
        setWebsiteTitle(data.title);
      })
      .catch((error) => console.error("Error fetching website title:", error));
  }, []);

  const handleAdoptClick = async (id) => {
    try {
      // Check if IP has already adopted
      console.log(userIp);
      const response = await fetch(`http://localhost:5000/check-adoption/${userIp}`);
      const data = await response.json();
      
      if (data.hasAdopted) {
        alert("You have already adopted a pet");
        return;
      }
      
      setShowForm((prev) => ({ ...prev, [id]: true }));
    } catch (error) {
      console.error("Error checking adoption status:", error);
      alert("Error checking adoption status. Please try again.");
    }
  };

  const handleAdoptSubmit = async (id, petName) => {
    if (!adopteeName.trim()) {
      alert("Please enter your name to adopt.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/adopt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, adopteeName }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        alert(data.error);
        return;
      }

      // Refresh adoption status
      const petsResponse = await fetch("http://localhost:5000/pets");
      const petsData = await petsResponse.json();
      const adopted = {};
      petsData.forEach(pet => {
        if (pet.adopted_by) {
          adopted[pet.id] = pet.adopted_by;
        }
      });
      setAdoptedPets(adopted);
      setShowForm((prev) => ({ ...prev, [id]: false }));
      setAdopteeName("");
    } catch (error) {
      alert("Error adopting pet: " + error.message);
    }
  };

  const handleBackClick = (id) => {
    setShowForm((prev) => ({ ...prev, [id]: false }));
  };

  return (
    <div>
      <h1>{websiteTitle}</h1>
      <div className="description-section">
        <h2>{pageTitle}</h2>
        <p>{pageDescription}</p>
      </div>
      <div className="grid-container">
        {pets.map((pet) => (
          <div key={pet.id} className={`card ${adoptedPets[pet.id] ? "adopted" : ""}`}>
            {adoptedPets[pet.id] && <div className="overlay">Adopted<div className="emoji">😊</div></div>}
            {showForm[pet.id] ? (
              <form
                className="adoption-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAdoptSubmit(pet.id, pet.name);
                }}
              >
                <input
                  type="text"
                  placeholder="Your Name"
                  value={adopteeName}
                  onChange={(e) => setAdopteeName(e.target.value)}
                />
                <button type="submit">Submit</button>
                <button type="button" onClick={() => handleBackClick(pet.id)}>Back</button>
              </form>
            ) : (
              <>
                <img src={pet.image} alt={pet.name} />
                <h3>{pet.name}</h3>
                <p>{pet.description}</p>
                {!adoptedPets[pet.id] && <button onClick={() => handleAdoptClick(pet.id)}>Adopt</button>}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}