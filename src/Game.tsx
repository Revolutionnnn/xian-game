import React, { useState, useEffect } from 'react';
import { Button, Form, InputGroup, Spinner } from 'react-bootstrap';
import Swal from 'sweetalert2';
import './Game.css';
import rockIcon from './icons/rock.png';
import paperIcon from './icons/paper.png';
import scissorsIcon from './icons/scissors.png';
import Xian from "xian-js";
import { Wallet } from "xian-js";
import type { I_NetworkSettings, I_TxInfo } from "xian-js";

type Option = 'Rock' | 'Paper' | 'Scissors' | null;

const Game: React.FC = () => {
  const [selectedOption, setSelectedOption] = useState<Option>(null);
  const [view, setView] = useState<string>('start');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');
  const [balanceWallet, setBalance] = useState<number>();
  const [isLoading, setIsLoading] = useState<boolean>(false); // Estado para el spinner

  const movementMap = {
    Rock: 1,
    Paper: 2,
    Scissors: 3
  };

  useEffect(() => {
    checkBalance();
  }, [walletAddress]);

  const networkInfo: I_NetworkSettings = {
    chain_id: "xian-testnet-11",
    masternode_hosts: ["https://testnet.xian.org"]
  };
  
  const masternodeAPI = new Xian.MasternodeAPI(networkInfo);

  const checkBalance = async () => {
    const balance = await masternodeAPI.getCurrencyBalance(walletAddress);
    setBalance(balance.toString());
  };

  const handleStartGame = async () => {
    const { value: privateKey } = await Swal.fire({
      title: 'Welcome to the XIAN Game!',
      text: 'To play, you can use an existing wallet by entering your private key below, or leave it blank to create a new wallet automatically.',
      input: "text",
      inputLabel: "Private Key (leave blank to create a new wallet)",
      inputPlaceholder: "Enter your private key or leave blank",
      showCancelButton: true,
      confirmButtonText: "Continue",
      cancelButtonText: "Cancel",
      inputValidator: (value) => {
        if (value && value.length < 64) {
          return 'Please enter a valid private key or leave the field blank to create a new wallet';
        }
      }
    });
  
    if (privateKey === undefined) {
      return;
    }
  
    try {
      const new_wallet = privateKey
        ? Wallet.create_wallet({ sk: privateKey })
        : Wallet.create_wallet();
  
      setWalletAddress(new_wallet.vk);
      setPrivateKey(new_wallet.sk);
  
      await checkBalance();
  
      Swal.fire({
        title: 'Success!',
        text: `Your wallet is ready. Address: ${new_wallet.vk}`,
        icon: 'success',
        confirmButtonText: 'Start Playing'
      });
      setView('Play')
  
    } catch (error) {
      console.error("Error creating wallet:", error);
      Swal.fire({
        title: 'Error',
        text: 'There was an error with the private key provided. Please try again or leave the field blank to create a new wallet.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  };
  

  const handleSelect = (option: Option) => {
    setSelectedOption(option);
  };

  const handlePlay = async () => {
    setIsLoading(true);

    const kwargs = {
      amount: 3,
      to: 'con_prueba3'
    };
    
    let tx_info: I_TxInfo = {
      senderVk: walletAddress,
      chain_id: networkInfo.chain_id,
      contractName: "currency",
      methodName: "approve",
      kwargs,
      stampLimit: 100
    };
  
    try {
      const tx = new Xian.TransactionBuilder(networkInfo, tx_info);
      const res = await tx.send(privateKey);
      
      if (!res.success) {
        setIsLoading(false);
        Swal.fire({
          title: 'Error',
          text: res.error,
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
      
      let tx_info_play: I_TxInfo = {
        senderVk: walletAddress,
        chain_id: networkInfo.chain_id,
        contractName: "con_prueba3",
        methodName: "Play",
        kwargs: {
          move: movementMap[selectedOption as Option]
        },
        stampLimit: 100
      };
      
      const tx_play = new Xian.TransactionBuilder(networkInfo, tx_info_play);
      const res_play = await tx_play.send(privateKey);
      
      if (res_play.success) {
        await checkBalance();
        Swal.fire({
          title: 'Result',
          text: `${res_play.data.result} remember to check your balance`,
          icon: 'success',
          confirmButtonText: 'Aceptar'
        });
      }
    } catch (error) {
      console.error("Error en TransactionBuilder:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <div className="game">
      {view === 'start' ? (
        <div className="start-screen">
          <h1>Welcome to the XIAN Game</h1>
          <Button variant="primary" onClick={handleStartGame}>
              Start Game
          </Button>
        </div>
      ) : (
        <>
          <div className="top-buttons">
            <Button variant={view === 'play' ? 'primary' : 'secondary'} onClick={() => setView('play')}>
              Play
            </Button>
            <Button variant={view === 'account' ? 'primary' : 'secondary'} onClick={() => setView('account')}>
              My Account
            </Button>
          </div>

          {view === 'play' ? (
            <div className="game-options">
              <h1>Rock, Paper, Scissors</h1>
              <div className="options">
                <button
                  className={`option ${selectedOption === 'Rock' ? 'selected' : ''}`}
                  onClick={() => handleSelect('Rock')}
                >
                  <img src={rockIcon} alt="Rock" className="icon" />
                  Rock
                </button>
                <button
                  className={`option ${selectedOption === 'Paper' ? 'selected' : ''}`}
                  onClick={() => handleSelect('Paper')}
                >
                  <img src={paperIcon} alt="Paper" className="icon" />
                  Paper
                </button>
                <button
                  className={`option ${selectedOption === 'Scissors' ? 'selected' : ''}`}
                  onClick={() => handleSelect('Scissors')}
                >
                  <img src={scissorsIcon} alt="Scissors" className="icon" />
                  Scissors
                </button>
              </div>
              <Button variant="success" className="play-button" onClick={handlePlay} disabled={isLoading}>
                {isLoading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Play'}
              </Button>
            </div>
          ) : (
            <div className="account-section">
              <h1>My Account</h1>
              <div className="account-info">
                <p>Balance: {balanceWallet} XIAN</p>
                <Button variant="primary" onClick={checkBalance}>
                  Refresh
                </Button>
                
                <Form.Group>
                  <Form.Label>Wallet</Form.Label>
                  <InputGroup>
                    <Form.Control type="text" value={walletAddress} disabled />
                    <Button variant="outline-secondary" onClick={() => copyToClipboard(walletAddress)}>
                      Copy
                    </Button>
                  </InputGroup>
                </Form.Group>

                <Form.Group>
                  <Form.Label>Private Key</Form.Label>
                  <InputGroup>
                    <Form.Control 
                      type="password" // Cambia el tipo a "password" para que se oculte
                      value={privateKey} 
                      disabled 
                    />
                    <Button variant="outline-secondary" onClick={() => copyToClipboard(privateKey)}>
                      Copy
                    </Button>
                  </InputGroup>
                </Form.Group>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Game;
