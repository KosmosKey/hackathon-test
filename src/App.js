import logo from "./logo.svg";
import "./App.css";
import QRCode from "react-qr-code";
import { parseUri } from "@walletconnect/utils";
import { useState } from "react";
import { Core } from "@walletconnect/core";
import { Web3Wallet, IWeb3Wallet } from "@walletconnect/web3wallet";
import { ProposalTypes, SessionTypes } from "@walletconnect/types";

function App() {
  const [uri, setUri] = useState();
  const [address, setAddress] = useState(
    "0x9A9A200C587f49f9783B041225269Ea2a307495B"
  );

  const core = new Core({
    projectId: process.env.REACT_APP_PROJECT_ID,
  });

  const WCMetadata = {
    name: "Hackathon",
    description: "Hackathon",
    url: "www.google.com",
    icons: [
      "https://pbs.twimg.com/profile_images/1226080848396640256/aRdvQaOH_400x400.jpg",
    ],
  };

  const onClick = () => {
    const result = parseUri(uri);

    if (!result?.version) return alert("Not valid");

    if (result?.version === "1") return alert("V1 is not supported");

    onConnect();
  };

  const handleSendTransaction = async (id, params, topic) => {
    try {
      console.log(id, topic, params?.request);
      if (!window.ethereum.isConnected()) {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        console.log("accounts", accounts);
      }
      console.log(params);
      console.log({
        ...{
          from: params?.request?.from,
          to: params?.request?.to,
          data: params?.request?.data,
        },
      });
      console.log(params?.request?.params)
      const res = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: params?.request?.params || [],
      });
      console.log(res);
    } catch (err) {
      console.log("err.message", err.message);
    }
  };

  const onConnect = async () => {
    try {
      const _web3wallet = await Web3Wallet.init({
        core,
        metadata: WCMetadata,
      });

      _web3wallet.on("session_proposal", async (proposal) => {
        const { requiredNamespaces, optionalNamespaces } = proposal.params;
        console.log(optionalNamespaces);
        const namespaceKey = "eip155";

        const requiredNamespace = requiredNamespaces[namespaceKey];

        const chains = requiredNamespace.chains || [];

        const accounts = chains.map((chain) => {
          return `${chain}:${address}`;
        });

        const namespace = {
          accounts,
          chains,
          methods: requiredNamespace.methods || [],
          events: requiredNamespace.events || [],
        };

        const session = await _web3wallet.approveSession({
          id: proposal.id,
          namespaces: {
            [namespaceKey]: namespace,
          },
        });
        console.log("session", session);
      });

      _web3wallet.on("session_request", async (event) => {
        const { topic, params, id } = event;
        const { request } = params;
        const { method } = request;
        console.log(method);
        if (method === "eth_sendTransaction") {
          await handleSendTransaction(id, params, topic);
        } else {
          await _web3wallet.respondSessionRequest({
            topic,
            response: {
              jsonrpc: "2.0",
              id: id,
              error: {
                code: 0,
                message: "Method not supported sorry!",
              },
            },
          });
        }
      });

      try {
        await _web3wallet.core.pairing.pair({ uri });
      } catch (e) {
        console.error(e.message);
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  return (
    <div className="App">
      <input
        value={uri}
        placeholder="ws"
        onChange={(e) => setUri(e.target.value)}
        style={{ width: "750px", padding: "20px" }}
      />
      <input
        value={address}
        placeholder="address"
        onChange={(e) => setAddress(e.target.value)}
        style={{ width: "750px", padding: "20px" }}
      />

      <button onClick={() => handleSendTransaction()}>Sign transaction</button>
      <button style={{ width: "750px", padding: "20px" }} onClick={onClick}>
        Get QR Code
      </button>
    </div>
  );
}

export default App;
