{
  description = "Flake for UMBRA Legal Apps (React, Vite, Docker)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            pkgs.nodejs_20
            pkgs.yarn
            pkgs.docker
            pkgs.git
            pkgs.openssh
          ];

          shellHook = ''
            export NODE_OPTIONS=--max-old-space-size=4096
            echo "Welcome to UMBRA Legal Apps devShell!"
            echo "Node version: $(node --version)"
            echo "Yarn version: $(yarn --version)"
          '';
        };
      }
    );
}