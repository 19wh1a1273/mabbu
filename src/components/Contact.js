import React, { useState, useEffect } from 'react';

function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', favDestination: '' });
  const [profilePic, setProfilePic] = useState(null);

  useEffect(() => {
    const savedData = {
      name: localStorage.getItem('name') || '',
      email: localStorage.getItem('email') || '',
      favDestination: localStorage.getItem('favDestination') || '',
    };
    setFormData(savedData);
    const savedPic = localStorage.getItem('profilePicture');
    if (savedPic) setProfilePic(savedPic);
  }, []);

  const handleChange = ({ target: { name, value } }) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    localStorage.setItem(name, value);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target.result;
        setProfilePic(imageUrl);
        localStorage.setItem('profilePicture', imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfilePic = () => {
    setProfilePic(null);
    localStorage.removeItem('profilePicture');
  };

  const formStyle = {
    backgroundColor: '#f4f4f4',
    margin: '20px auto',
    padding: '20px',
    borderRadius: '10px',
    width: '50%',
  };

  const inputStyle = {
    width: '80%',
    padding: '10px',
    marginTop: '5px',
    borderRadius: '5px',
    border: '1px solid #ddd',
  };

  return (
    <main>
      <section style={formStyle}>
        <h2>Get in Touch</h2>
        <p>We’d love to hear from you! Fill out the form below.</p>
        <form>
          <label>Name:</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} style={inputStyle} required />
          <br /><br />
          <label>Email:</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} style={inputStyle} required />
          <br /><br />
          <label>Favorite Destination:</label>
          <input
            type="text"
            name="favDestination"
            value={formData.favDestination}
            onChange={handleChange}
            style={inputStyle}
            placeholder="Enter your favorite place"
          />
          <br /><br />
          <label>Upload Profile Picture:</label>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          <br /><br />
          {profilePic && (
            <>
              <img src={profilePic} alt="Profile preview" style={{ maxWidth: '150px', borderRadius: '50%' }} />
              <br />
              <button type="button" onClick={removeProfilePic} style={{ background: 'red', color: 'white', border: 'none', padding: '5px 10px' }}>
                Remove Picture
              </button>
              <br /><br />
            </>
          )}
          <input
            type="submit"
            value="Submit"
            style={{ backgroundColor: '#3498db', color: 'white', border: 'none', padding: '10px', width: '50%', borderRadius: '5px' }}
          />
        </form>
      </section>
    </main>
  );
}

export default Contact;