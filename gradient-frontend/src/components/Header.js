import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import userAvatar from '../assets/user.jpg';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../context/AuthContext';

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: ${({ theme }) => theme.colors.headerBackground};
  color: ${({ theme }) => theme.colors.text};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 2px 12px ${({ theme }) => theme.colors.shadow};
  position: relative;
  transition: background 0.3s ease, border-color 0.3s ease;
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);

  a {
    color: ${({ theme }) => theme.colors.textSecondary};
    text-decoration: none;
    margin: 0 1.25rem;
    font-size: 1.2rem;
    letter-spacing: 0.2px;
    padding-bottom: 0.6rem;
    transition: color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
    opacity: 0.9;

    &:hover {
      color: ${({ theme }) => theme.colors.text};
      opacity: 1;
    }

    &.active {
      color: ${({ theme }) => theme.colors.text};
      border-bottom: 3px solid ${({ theme }) => theme.colors.primary};
    }
  }
`;

const UserMenu = styled.div`
  display: flex;
  align-items: center;
  position: relative;
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #f1f3f6;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.border};
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
`;

const dropdownAppear = keyframes`
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

const UserButton = styled.button`
  display: flex;
  align-items: center;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  padding: 0;
`;

const UserDropdown = styled.div`
  ${({ closing }) => closing && 'pointer-events: none;'}
  position: absolute;
  top: 52px;
  right: 0;
  width: 320px;
  background: ${({ theme }) => theme.colors.headerBackground};
  border-radius: 16px;
  box-shadow: 0 10px 30px ${({ theme }) => theme.colors.shadow};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 1.25rem 1.2rem 1rem;
  z-index: 10;
  animation: ${dropdownAppear} 0.22s ease-out forwards;
  ${({ closing }) => closing && 'animation-direction: reverse; pointer-events: none;'}
`;

const UserTop = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const UserTopInfo = styled.div`
  margin-left: 0.75rem;

  h4 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
  }

  span {
    display: block;
    font-size: 0.8rem;
    opacity: 0.8;
  }
`;

const MenuList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const MenuItem = styled.li`
  a,
  button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.65rem 0.7rem;
    border-radius: 999px;
    background: transparent;
    border: none;
    text-align: left;
    color: ${({ theme }) => theme.colors.textSecondary};
    text-decoration: none;
    cursor: pointer;
    font-size: 0.95rem;
    transition: background 0.2s ease, color 0.2s ease;

    &:hover {
      background: ${({ theme }) => theme.colors.cardBackground};
      color: ${({ theme }) => theme.colors.text};
    }
  }

  &.logout button {
    color: #ff4d4f;

    &:hover {
      background: rgba(255, 77, 79, 0.12);
      color: #ff4d4f;
    }
  }
`;

const IconCircle = styled.span`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.cardBackground};
  font-size: 0.95rem;
`;

const StatusIndicator = styled.span`
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid ${({ theme }) => theme.colors.headerBackground};
  background-color: #21ff00; /* online */
`;

const Header = () => {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const toggleMenu = () => {
    setOpen((prev) => !prev);
  };

  const closeMenu = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 220); // match animation duration
  }, [closing]);
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, closeMenu]);

  const handleLogout = () => {
    logout();
    closeMenu();
    navigate('/login');
  };

  return (
    <HeaderContainer>
      <ThemeToggle />
      <Nav>
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>Аналітика</NavLink>
        <NavLink to="/automation" className={({ isActive }) => (isActive ? 'active' : '')}>Автоматизація</NavLink>
      </Nav>
      <UserMenu ref={menuRef}>
        <UserButton type="button" onClick={toggleMenu}>
          <UserAvatar>
            <AvatarImage src={userAvatar} alt="User avatar" />
            <StatusIndicator />
          </UserAvatar>
        </UserButton>
        {(open || closing) && (
          <UserDropdown closing={closing}>
            <UserTop>
              <UserAvatar>
                <AvatarImage src={userAvatar} alt="User avatar" />
                <StatusIndicator />
              </UserAvatar>
              <UserTopInfo>
                <h4>{user?.email || 'User'}</h4>
                <span>Admin</span>
              </UserTopInfo>
            </UserTop>
            <MenuList>
              <MenuItem>
                <Link to="/profile" onClick={closeMenu}>
                  <IconCircle>👤</IconCircle>
                  <span>Профіль</span>
                </Link>
              </MenuItem>
              <MenuItem>
                <Link to="/leads-history" onClick={closeMenu}>
                  <IconCircle>🕒</IconCircle>
                  <span>Історія Лідів</span>
                </Link>
              </MenuItem>
              <MenuItem>
                <Link to="/settings" onClick={closeMenu}>
                  <IconCircle>⚙️</IconCircle>
                  <span>Налаштування</span>
                </Link>
              </MenuItem>
              <MenuItem className="logout">
                <button type="button" onClick={handleLogout}>
                  <IconCircle>↩</IconCircle>
                  <span>Вийти</span>
                </button>
              </MenuItem>
            </MenuList>
          </UserDropdown>
        )}
      </UserMenu>
    </HeaderContainer>
  );
};

export default Header;
