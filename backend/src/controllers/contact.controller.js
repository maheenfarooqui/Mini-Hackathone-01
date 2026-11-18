
import Contact from "../models/contact.model.js";

export const createContact = async (req, res) => {
  try {
    const { name, phone, email, message } = req.body;

    if (
      !name?.trim() ||
      !phone?.trim() ||
      !email?.trim() ||
      !message?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all contact fields.",
      });
    }

    const contact = await Contact.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      message: message.trim(),
      user: req.user?.id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Your query has been submitted successfully.",
      contact,
    });
  } catch (error) {
    console.error("Create contact error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit your query.",
    });
  }
};
