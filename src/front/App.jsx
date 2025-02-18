import { Route, Routes } from "react-router-dom";
import { ThemeProvider } from "../components/ui/theme-provider.tsx";
import MedicineForm from "./componentes/medicineForm.jsx";
import RecipeList from "./componentes/RecipeList.jsx";
import MedicamentoLista from "./componentes/medicamentoLista.jsx";
import Home from "./views/home.jsx";

const App = () => {
  return (
    <ThemeProvider defaultTheme='light' storageKey='vite-ui-theme'>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/medicamento' element={<MedicamentoLista />} />
        <Route path='/medicamento/:id' element={<MedicineForm />} />
        <Route path='/receta' element={<RecipeList />} />
      </Routes>
    </ThemeProvider>
  );
};

export default App;
