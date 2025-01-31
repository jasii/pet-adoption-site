import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PetAdoption from "./PetAdoption";
import Admin from "./Admin";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="/" element={<PetAdoption />} />
      </Routes>
    </Router>
  );
}

export default App;