import { Test } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Invite } from "../invites/entities/invite.entity"
import { InvitesService } from "../invites/invites.service"
import { Group } from "./entities/group.entity"
import { GroupsService } from "./groups.service"

describe("GroupsService", () => {
    let groupsService: GroupsService
    let invitesService: InvitesService

    beforeAll(async () => {
        const module = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRootAsync({
                    useFactory: () => ({
                        type: "sqlite",
                        database: ":memory:",
                        dropSchema: true,
                        entities: [Group, Invite],
                        synchronize: true
                    })
                }),
                TypeOrmModule.forFeature([Group]),
                TypeOrmModule.forFeature([Invite])
            ],
            providers: [GroupsService, InvitesService]
        }).compile()

        groupsService = await module.resolve(GroupsService)
        invitesService = await module.resolve(InvitesService)
    })

    describe("# createGroup", () => {
        it("Should create a group", async () => {
            const { treeDepth, members } = await groupsService.createGroup(
                {
                    name: "Group1",
                    description: "This is a description",
                    treeDepth: 16
                },
                "admin"
            )

            expect(treeDepth).toBe(16)
            expect(members).toHaveLength(0)
        })

        it("Should not create two groups with the same name", async () => {
            const result = groupsService.createGroup(
                {
                    name: "Group1",
                    description: "This is a description",
                    treeDepth: 16
                },
                "admin"
            )

            await expect(result).rejects.toThrow("UNIQUE constraint failed")
        })
    })

    describe("# updateGroup", () => {
        it("Should update a group", async () => {
            const { description } = await groupsService.updateGroup(
                {
                    description: "This is a new description"
                },
                "Group1",
                "admin"
            )

            expect(description).toContain("new")
        })

        it("Should not update a group if the admin is the wrong one", async () => {
            const result = groupsService.updateGroup(
                {
                    description: "This is a new description"
                },
                "Group1",
                "wrong-admin"
            )

            await expect(result).rejects.toThrow("No permissions")
        })
    })

    describe("# getAllGroupsData", () => {
        it("Should return a list of groups", async () => {
            const result = await groupsService.getAllGroups()

            expect(result).toHaveLength(1)
        })
    })

    describe("# getGroupsByAdmin", () => {
        it("Should return a list of groups by admin", async () => {
            const result = await groupsService.getGroupsByAdmin("admin")

            expect(result).toHaveLength(1)
        })
    })
    describe("# getGroup", () => {
        it("Should return a group", async () => {
            const { treeDepth, members } = await groupsService.getGroup(
                "Group1"
            )

            expect(treeDepth).toBe(16)
            expect(members).toHaveLength(0)
        })

        it("Should throw 404 error about not exist group", async () => {
            const result = groupsService.getGroup("Group2")

            await expect(result).rejects.toThrow("not found")
        })
    })

    describe("# addMember", () => {
        let invite: Invite

        beforeAll(async () => {
            invite = await invitesService.createInvite(
                { groupName: "Group1" },
                "admin"
            )
        })

        it("Should add a member to an existing group", async () => {
            const { members } = await groupsService.addMember(
                "Group1",
                "123123",
                invite.code
            )

            expect(members).toHaveLength(1)
        })

        it("Should not add any member if they already exist", async () => {
            const result = groupsService.addMember(
                "Group1",
                "123123",
                invite.code
            )

            await expect(result).rejects.toThrow("already exists")
        })
    })

    describe("# isGroupMember", () => {
        it("Should return false if a member does not exist", async () => {
            const result = await groupsService.isGroupMember("Group1", "123122")

            expect(result).toBeFalsy()
        })

        it("Should return true if a member exists", async () => {
            const result = await groupsService.isGroupMember("Group1", "123123")

            expect(result).toBeTruthy()
        })
    })

    describe("# generateMerkleProof", () => {
        it("Should return a Merkle proof", async () => {
            const merkleproof = await groupsService.generateMerkleProof(
                "Group1",
                "123123"
            )

            expect(merkleproof).toBeDefined()
        })

        it("Should not return any Merkle proof if the member does not exist", async () => {
            const result = groupsService.generateMerkleProof("Group1", "123122")

            await expect(result).rejects.toThrow("does not exist")
        })
    })
})