import React from "react";
import "../styles/Modal.css";

const Modal = ({ isOpen, onClose, onSubmit, totalPages }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    const page = parseInt(e.target.page.value);
    if (page && page > 0 && page <= totalPages) {
      onSubmit(page);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay-leaderboard">
      <div className="modal-content-leaderboard">
        <button className="modal-close-leaderboard" onClick={onClose}>
          &times;
        </button>
        <h3>Jump to Page</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="number"
            name="page"
            min="1"
            max={totalPages}
            placeholder={`Enter page (1-${totalPages})`}
            className="modal-input-leaderboard"
            autoFocus
          />
          <div className="modal-buttons-leaderboard">
            <button
              type="button"
              onClick={onClose}
              className="modal-button-leaderboard cancel-leaderboard"
            >
              Cancel
            </button>
            <button type="submit" className="modal-button-leaderboard submit">
              Go
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Modal;
