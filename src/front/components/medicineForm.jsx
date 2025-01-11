const MedicineForm = () => {
  return (
    <div className='border p-4'>
      <h1>Medicine Form</h1>
      <form>
        <input type='file' id='file' name='file' />
        <button type='submit'>Submit</button>
      </form>
    </div>
  );
};

export default MedicineForm;
