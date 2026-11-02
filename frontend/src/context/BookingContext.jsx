import React, { createContext, useContext, useState, useEffect } from 'react';

const BookingContext = createContext();

export const BookingProvider = ({ children }) => {
  // Default checkIn is tomorrow, checkOut is 2 days from tomorrow
  const getInitialDates = () => {
    const today = new Date();
    const inDate = new Date(today);
    inDate.setDate(today.getDate() + 1);
    const outDate = new Date(today);
    outDate.setDate(today.getDate() + 3);
    return {
      checkIn: inDate.toISOString().split('T')[0],
      checkOut: outDate.toISOString().split('T')[0],
    };
  };

  const initialDates = getInitialDates();

  const [searchParams, setSearchParams] = useState({
    destination: '',
    checkIn: initialDates.checkIn,
    checkOut: initialDates.checkOut,
    adults: 2,
    children: 0,
    rooms: 1,
  });

  const [activeHold, setActiveHold] = useState(null); // { bookingId, bookingCode, expiresAt, totalAmount }

  // Check hold expiry timer
  useEffect(() => {
    if (!activeHold) return;

    const interval = setInterval(() => {
      const remaining = new Date(activeHold.expiresAt) - new Date();
      if (remaining <= 0) {
        setActiveHold(null);
        alert('Your 15-minute room hold has expired. The inventory has returned to availability.');
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeHold]);

  return (
    <BookingContext.Provider
      value={{
        searchParams,
        setSearchParams,
        activeHold,
        setActiveHold,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => useContext(BookingContext);
